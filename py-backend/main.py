# main.py (updated with proper ID management)
import os
import json
import logging
import tempfile
import re
from uuid import uuid4
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any
from bson import ObjectId

from fastapi import FastAPI, UploadFile, File, HTTPException, status, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Dict, Any
import jwt  # Make sure you have pyjwt installed: pip install pyjwt

# --- Services ---
from services.resumeParser import extract_text_from_pdf, parse_resume_with_genai
from services.vectoriser import pinecone_vectoriser
from services.retrival import CandidateRetrievalPipeline
from services.project_retrieval import ProjectRetrievalPipeline
from services.models import (
    ProjectRegisterRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    CandidateRegisterRequest,
    CandidateUpdateRequest,
    CandidateResponse,
    GetRankedCandidatesRequest,
    GetRankedCandidatesResponse,
    RelevantProjectsResponse,
    ParseResumeResponse,
    CandidateSummaryResponse,
    CandidateVectorsResponse
)


# ------------------------------------------------------------
# Environment + Logging setup
# ------------------------------------------------------------
from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sanitize_mongo_name(name: str) -> str:
    """
    Sanitize MongoDB database/collection names by replacing invalid characters.
    MongoDB names cannot contain: '.', ' ', '/', '\\', or null character.
    """
    if not name:
        return name
    # Replace invalid characters with underscore
    invalid_chars = ['.', ' ', '/', '\\', '\x00']
    sanitized = name
    for char in invalid_chars:
        sanitized = sanitized.replace(char, '_')
    # Remove leading/trailing underscores and ensure it's not empty
    sanitized = sanitized.strip('_')
    if not sanitized:
        sanitized = "default"
    return sanitized

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_RAW = os.getenv("MONGO_DB", "rag_ats")
MONGO_DB = sanitize_mongo_name(MONGO_DB_RAW)
MONGO_COL_RAW = os.getenv("MONGO_COL", "candidates")
MONGO_COL = sanitize_mongo_name(MONGO_COL_RAW)
DATASET_DIR = os.getenv("DATASET_DIR", "dataset")
os.makedirs(DATASET_DIR, exist_ok=True)

# Log if sanitization occurred
if MONGO_DB_RAW != MONGO_DB:
    logger.warning(f"MongoDB database name sanitized from '{MONGO_DB_RAW}' to '{MONGO_DB}'")
if MONGO_COL_RAW != MONGO_COL:
    logger.warning(f"MongoDB collection name sanitized from '{MONGO_COL_RAW}' to '{MONGO_COL}'")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
candidates_col = db[MONGO_COL]
projects_col = db[sanitize_mongo_name(os.getenv("MONGO_PROJECT_COL", "projects"))]
evaluations_col = db[sanitize_mongo_name(os.getenv("MONGO_EVAL_COL", "evaluations"))]

# ------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------
app = FastAPI(
    title="RAG-based ATS API with Pinecone",
    description="API for resume parsing, registration, and vectorization using Pinecone",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
      allow_origins=["http://localhost:5173"],  # Your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Health endpoints
# ------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "RAG-based ATS API with Pinecone running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "RAG-based ATS API with Pinecone", "version": "2.0.0"}

# ------------------------------------------------------------
# 1. Parse-Resume endpoint (unchanged)
# ------------------------------------------------------------
@app.post("/api/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(file: UploadFile = File(...)):
    """Parse a resume PDF file and return structured JSON data."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported",
        )

    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file_path = temp_file.name
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()

        logger.info(f"Processing resume file: {file.filename}")

        resume_text = extract_text_from_pdf(temp_file_path)
        if not resume_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from PDF.",
            )

        logger.info(f"Extracted {len(resume_text)} characters from PDF")

        parsed_data = parse_resume_with_genai(resume_text)
        if "error" in parsed_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse resume: {parsed_data['error']}",
            )

        logger.info("Resume parsing completed successfully")

        return {
            "success": True,
            "message": "Resume parsed successfully",
            "data": parsed_data,
            "filename": file.filename,
            "text_length": len(resume_text),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing resume: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error while processing resume: {str(e)}",
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file: {e}")

# ------------------------------------------------------------
# 2. Register confirmed JSON + add to Pinecone (UPDATED)
# ------------------------------------------------------------
# @app.post("/api/register-json", status_code=201, response_model=CandidateResponse)
# async def register_json(payload: CandidateRegisterRequest):
#     """
#     Accept confirmed JSON, store in MongoDB, and add to Pinecone incrementally.
#     """
#     try:
#         candidate_id = str(uuid4())
#         payload_copy = payload.model_dump(exclude_none=True)
        
#         # Add to Pinecone FIRST to get vector IDs
#         pinecone_result = pinecone_vectoriser.add_candidate(payload_copy, candidate_id)
        
#         if not pinecone_result["success"]:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Failed to add candidate to Pinecone: {pinecone_result.get('error', 'Unknown error')}"
#             )

#         # Now store in MongoDB WITH vector IDs
#         payload_copy["_id"] = candidate_id
#         payload_copy["created_at"] = datetime.utcnow().isoformat() + "Z"
#         payload_copy["vector_ids"] = pinecone_result["vector_ids"]  # Store vector IDs
#         payload_copy["pinecone_metadata"] = pinecone_result["metadata"]  # Store Pinecone metadata

#         # Insert in MongoDB
#         candidates_col.insert_one(payload_copy)
#         logger.info(f"Saved candidate to MongoDB with id: {candidate_id}")

#         # Save JSON to dataset/ (optional, for backup)
#         file_path = Path(DATASET_DIR) / f"{candidate_id}.json"
#         with open(file_path, "w", encoding="utf-8") as f:
#             json.dump(payload_copy, f, ensure_ascii=False, indent=2)

#         logger.info(f"Successfully registered candidate: {candidate_id}")
#         logger.info(f"Vector IDs stored: {pinecone_result['vector_ids']}")

#         return {
#             "success": True, 
#             "candidate_id": candidate_id,
#             "vector_ids": pinecone_result["vector_ids"],
#             "message": "Candidate registered successfully and added to vector database"
#         }

#     except Exception as e:
#         logger.exception("Failed to register JSON")
#         raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 2. Register confirmed JSON + add to Pinecone (UPDATED with user_id)
# ------------------------------------------------------------
@app.post("/api/register-json", status_code=201, response_model=CandidateResponse)
async def register_json(payload: dict, request: Request):
    """
    Accept confirmed JSON, store in MongoDB, and add to Pinecone incrementally.
    Now includes JWT user_id from authentication.
    """
    try:
        # Extract JWT user_id from request
        user_id = getattr(request.state, 'user_id', None)
        
        # If not found in request state, try to extract from JWT token in cookie
        if not user_id:
            token = request.cookies.get("token")
            if token:
                try:
                    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                    user_id = (
                        decoded.get("userId") or 
                        decoded.get("user_id") or 
                        decoded.get("id") or
                        decoded.get("userID")
                    )
                except jwt.ExpiredSignatureError:
                    raise HTTPException(status_code=401, detail="Token expired")
                except jwt.InvalidTokenError:
                    raise HTTPException(status_code=401, detail="Invalid token")

        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        print(f"🔍 Registering candidate for user_id: {user_id}")

        # Check if candidate already exists with this user_id
        existing_candidate = candidates_col.find_one({"user_id": user_id})
        
        candidate_id = None
        if existing_candidate:
            # Update existing candidate
            candidate_id = existing_candidate["_id"]
            print(f"✅ Updating existing candidate with ID: {candidate_id} for user_id: {user_id}")
        else:
            # Create new candidate with UUID _id
            candidate_id = str(uuid4())
            print(f"✅ Creating new candidate with ID: {candidate_id} for user_id: {user_id}")

        # Add to Pinecone FIRST to get vector IDs
        pinecone_result = pinecone_vectoriser.add_candidate(payload, candidate_id)
        
        if not pinecone_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add candidate to Pinecone: {pinecone_result.get('error', 'Unknown error')}"
            )

        # Prepare MongoDB document
        mongo_doc = {
            "_id": candidate_id,
            "user_id": user_id,  # Store the JWT user_id
            "created_at": datetime.utcnow().isoformat() + "Z",
            "vector_ids": pinecone_result["vector_ids"],
            "pinecone_metadata": pinecone_result["metadata"]
        }
        
        # Merge with the payload data
        mongo_doc.update(payload)

        if existing_candidate:
            # Update existing candidate
            candidates_col.replace_one({"_id": candidate_id}, mongo_doc)
        else:
            # Insert new candidate
            candidates_col.insert_one(mongo_doc)
        
        logger.info(f"✅ Saved candidate to MongoDB: {candidate_id} for user: {user_id}")

        # Save JSON to dataset/ (optional, for backup)
        file_path = Path(DATASET_DIR) / f"{candidate_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(mongo_doc, f, ensure_ascii=False, indent=2)

        logger.info(f"✅ Successfully registered candidate: {candidate_id} for user: {user_id}")
        logger.info(f"✅ Vector IDs stored: {pinecone_result['vector_ids']}")

        return {
            "success": True, 
            "candidate_id": candidate_id,
            "user_id": user_id,
            "vector_ids": pinecone_result["vector_ids"],
            "message": "Candidate registered successfully and added to vector database"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to register JSON")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 3. Retrieve candidate (UPDATED to include vector IDs)
# ------------------------------------------------------------
@app.get("/api/candidate-get/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str):
    doc = candidates_col.find_one({"_id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Convert ObjectId to string for JSON serialization
    doc["_id"] = str(doc["_id"])
    
    return {
        "success": True, 
        "candidate": doc,
        "vector_ids": doc.get("vector_ids", {})
    }

# ------------------------------------------------------------
# 4. Update candidate JSON + update Pinecone (UPDATED)
# ------------------------------------------------------------
# @app.put("/api/candidate-put/{candidate_id}", response_model=CandidateResponse)
# async def update_candidate(candidate_id: str, payload: CandidateUpdateRequest):
#     try:
#         # Check if candidate exists
#         existing_doc = candidates_col.find_one({"_id": candidate_id})
#         if not existing_doc:
#             raise HTTPException(status_code=404, detail="Candidate not found")

#         # Convert Pydantic model to dict for Pinecone
#         payload_dict = payload.model_dump(exclude_none=True)
        
#         # Update in Pinecone
#         pinecone_result = pinecone_vectoriser.update_candidate(payload_dict, candidate_id)
        
#         if not pinecone_result["success"]:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Failed to update candidate in Pinecone: {pinecone_result.get('error', 'Unknown error')}"
#             )

#         # Update MongoDB document
#         payload_copy = payload.model_dump(exclude_none=True)
#         payload_copy["_id"] = candidate_id
#         payload_copy["updated_at"] = datetime.utcnow().isoformat() + "Z"
#         payload_copy["vector_ids"] = pinecone_result["vector_ids"]  # Update vector IDs
#         payload_copy["pinecone_metadata"] = pinecone_result["metadata"]  # Update metadata

#         candidates_col.replace_one({"_id": candidate_id}, payload_copy, upsert=True)

#         # Update dataset file (optional backup)
#         file_path = Path(DATASET_DIR) / f"{candidate_id}.json"
#         with open(file_path, "w", encoding="utf-8") as f:
#             json.dump(payload_copy, f, ensure_ascii=False, indent=2)

#         logger.info(f"Successfully updated candidate: {candidate_id}")
#         logger.info(f"Updated vector IDs: {pinecone_result['vector_ids']}")

#         return {
#             "success": True, 
#             "candidate_id": candidate_id,
#             "vector_ids": pinecone_result["vector_ids"],
#             "message": "Candidate updated successfully in vector database"
#         }

#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.exception("Failed to update candidate")
#         raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 4. Update candidate JSON + update Pinecone (UPDATED with user_id support)
# ------------------------------------------------------------
@app.put("/api/candidate-put/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(candidate_id: str, payload: dict, request: Request):
    try:
        # Extract JWT user_id for verification
        user_id = getattr(request.state, 'user_id', None)
        if not user_id:
            token = request.cookies.get("token")
            if token:
                try:
                    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                    user_id = decoded.get("userId") or decoded.get("id")
                except:
                    pass

        # Check if candidate exists
        existing_doc = candidates_col.find_one({"_id": candidate_id})
        if not existing_doc:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Verify ownership if user_id is available
        if user_id and existing_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this candidate")

        # Convert payload to dict for Pinecone
        payload_dict = payload
        
        # Update in Pinecone
        pinecone_result = pinecone_vectoriser.update_candidate(payload_dict, candidate_id)
        
        if not pinecone_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update candidate in Pinecone: {pinecone_result.get('error', 'Unknown error')}"
            )

        # Update MongoDB document
        update_data = {
            **payload_dict,
            "_id": candidate_id,
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "vector_ids": pinecone_result["vector_ids"],
            "pinecone_metadata": pinecone_result["metadata"]
        }
        
        # Preserve user_id if it exists
        if "user_id" in existing_doc:
            update_data["user_id"] = existing_doc["user_id"]
        elif user_id:
            update_data["user_id"] = user_id

        candidates_col.replace_one({"_id": candidate_id}, update_data, upsert=True)

        # Update dataset file (optional backup)
        file_path = Path(DATASET_DIR) / f"{candidate_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(update_data, f, ensure_ascii=False, indent=2)

        logger.info(f"✅ Successfully updated candidate: {candidate_id}")
        logger.info(f"✅ Updated vector IDs: {pinecone_result['vector_ids']}")

        return {
            "success": True, 
            "candidate_id": candidate_id,
            "vector_ids": pinecone_result["vector_ids"],
            "message": "Candidate updated successfully in vector database"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update candidate")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 5. Delete candidate + remove from Pinecone (UPDATED)
# ------------------------------------------------------------
@app.delete("/candidate/{candidate_id}")
async def delete_candidate(candidate_id: str):
    try:
        # Get candidate first to log vector IDs
        candidate = candidates_col.find_one({"_id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Delete from MongoDB
        result = candidates_col.delete_one({"_id": candidate_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Delete from Pinecone using stored vector IDs
        vector_ids = candidate.get("vector_ids", {})
        logger.info(f"Deleting candidate {candidate_id} with vector IDs: {vector_ids}")
        
        success = pinecone_vectoriser.delete_candidate(candidate_id)
        
        if not success:
            logger.warning(f"Failed to delete candidate {candidate_id} from Pinecone")

        # Delete dataset file (optional)
        file_path = Path(DATASET_DIR) / f"{candidate_id}.json"
        if file_path.exists():
            file_path.unlink()

        return {
            "success": True, 
            "message": "Candidate deleted successfully",
            "deleted_vector_ids": vector_ids
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to delete candidate")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 6. Get candidate vector IDs (helper endpoint)
# ------------------------------------------------------------
@app.get("/candidate/{candidate_id}/vectors", response_model=CandidateVectorsResponse)
async def get_candidate_vectors(candidate_id: str):
    """Get the vector IDs for a candidate"""
    doc = candidates_col.find_one({"_id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {
        "success": True,
        "candidate_id": candidate_id,
        "vector_ids": doc.get("vector_ids", {}),
        "name": doc.get("name", "Unknown")
    }


# ------------------------------------------------------------
# Helper function: Extract candidate summary
# ------------------------------------------------------------
def extract_candidate_summary(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract candidate summary details from MongoDB document:
    1) Highest qualification (only qualification + category)
    2) Project - description + project_skills
    3) Experience - designation + description + experience_skills
    4) Certifications
    """
    # --- Highest Qualification ---
    education_data = doc.get("education", [])
    highest_qualification = None
    if isinstance(education_data, list) and education_data:
        education_rank = {
            "post graduate": 4, "masters": 4, "master": 4,
            "undergraduate": 3, "bachelor": 3, "be": 3, "b.tech": 3, "b.e.": 3,
            "diploma": 2, "vocational": 2,
            "higher secondary": 1, "hsc": 1, "12th": 1,
            "secondary": 0, "ssc": 0, "10th": 0
        }
        best_edu, best_score = None, -1
        for edu in education_data:
            qual = edu.get("qualification", "").lower()
            for key, score in education_rank.items():
                if key in qual and score > best_score:
                    best_score = score
                    best_edu = edu
        highest_qualification = best_edu or education_data[0]

        # Only keep qualification + category
        highest_qualification = {
            "qualification": highest_qualification.get("qualification", "Unknown"),
            "category": highest_qualification.get("category", "Unknown")
        }
    else:
        highest_qualification = {"qualification": "Not available", "category": "Not available"}

    # --- Projects ---
    projects_data = doc.get("projects", [])
    projects = []
    if isinstance(projects_data, list):
        for proj in projects_data:
            description = proj.get("description", "No description provided.")
            project_skills = (
                proj.get("project_skills") 
                or proj.get("skills") 
                or proj.get("technologies") 
                or []
            )
            if isinstance(project_skills, str):
                project_skills = [s.strip() for s in project_skills.split(",") if s.strip()]
            projects.append({
                "description": description,
                "project_skills": project_skills
            })

    # --- Experience ---
    experience_data = doc.get("experience", [])
    experience = []
    if isinstance(experience_data, list):
        for exp in experience_data:
            designation = exp.get("designation", "Unknown Role")
            description = exp.get("description", "No description provided.")
            experience_skills = (
                exp.get("experiance_skills")
                or exp.get("skills")
                or exp.get("technologies")
                or []
            )
            if isinstance(experience_skills, str):
                experience_skills = [s.strip() for s in experience_skills.split(",") if s.strip()]
            experience.append({
                "designation": designation,
                "description": description,
                "experience_skills": experience_skills
            })

    # --- Certifications ---
    certifications = doc.get("certifications", [])
    if not isinstance(certifications, list):
        certifications = []

    return {
        "highest_qualification": highest_qualification,
        "projects": projects,
        "experience": experience,
        "certifications": certifications
    }

# ------------------------------------------------------------
# 7. Get candidate summary details by ID (Final)
# ------------------------------------------------------------
@app.get("/candidate/{candidate_id}/summary", response_model=CandidateSummaryResponse)
async def get_candidate_summary(candidate_id: str):
    """
    Retrieve candidate summary details:
    1) Highest qualification (only qualification + category)
    2) Project - description + project_skills
    3) Experience - designation + description + experience_skills
    4) Certifications
    """
    doc = candidates_col.find_one({"_id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")

    summary = extract_candidate_summary(doc)
    return summary




# ------------------------------------------------------------
# 10. Register Project (UPDATED with deadline support)
# ------------------------------------------------------------
# @app.post("/api/register-project", status_code=201, response_model=ProjectResponse)
# async def register_project(payload: ProjectRegisterRequest):
#     """
#     Register a project with project_description and project_skills.
#     Stores in MongoDB and creates 2 vectors in Pinecone (project_description and project_skills).
#     Supports optional application_deadline field.
#     """
#     try:
#         # Convert Pydantic model to dict
#         payload_dict = payload.model_dump(exclude_none=True)
        
#         # Validate required fields
#         project_description = payload_dict.get("project_description", "")
#         project_skills = payload_dict.get("project_skills", [])
#         application_deadline = payload_dict.get("application_deadline")
        
#         if not project_description:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="project_description is required"
#             )
        
#         if not project_skills:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="project_skills is required (list or string)"
#             )
        
#         # Validate application_deadline if provided
#         if application_deadline:
#             try:
#                 # Parse to ensure it's a valid ISO format datetime
#                 deadline_str = str(application_deadline).strip()
#                 # Normalize: replace Z with +00:00 for parsing
#                 if deadline_str.endswith('Z'):
#                     deadline_str = deadline_str.replace('Z', '+00:00')
#                 deadline_dt = datetime.fromisoformat(deadline_str)
                
#                 # Ensure timezone-aware (assume UTC if naive)
#                 if deadline_dt.tzinfo is None:
#                     deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
#                 else:
#                     # Convert to UTC if not already
#                     deadline_dt = deadline_dt.astimezone(timezone.utc)
                
#                 # Store as ISO format string in UTC with Z suffix
#                 payload_dict["application_deadline"] = deadline_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
#             except (ValueError, AttributeError) as e:
#                 raise HTTPException(
#                     status_code=status.HTTP_400_BAD_REQUEST,
#                     detail=f"application_deadline must be in ISO format (e.g., '2024-12-31T23:59:59Z'). Error: {str(e)}"
#                 )
        
#         # Generate project ID
#         project_id = str(uuid4())
#         payload_copy = dict(payload_dict)
        
#         # Add to Pinecone FIRST to get vector IDs
#         pinecone_result = pinecone_vectoriser.add_project(payload_copy, project_id)
        
#         if not pinecone_result["success"]:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Failed to add project to Pinecone: {pinecone_result.get('error', 'Unknown error')}"
#             )
        
#         # Now store in MongoDB WITH vector IDs
#         payload_copy["_id"] = project_id
#         payload_copy["created_at"] = datetime.utcnow().isoformat() + "Z"
#         payload_copy["vector_ids"] = pinecone_result["vector_ids"]  # Store vector IDs
#         payload_copy["pinecone_metadata"] = pinecone_result["metadata"]  # Store Pinecone metadata
        
#         # Insert in MongoDB
#         projects_col.insert_one(payload_copy)
#         logger.info(f"Saved project to MongoDB with id: {project_id}")
        
#         logger.info(f"Successfully registered project: {project_id}")
#         logger.info(f"Vector IDs stored: {pinecone_result['vector_ids']}")
        
#         return {
#             "success": True,
#             "project_id": project_id,
#             "vector_ids": pinecone_result["vector_ids"],
#             "message": "Project registered successfully and added to vector database"
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.exception("Failed to register project")
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/register-project", status_code=201, response_model=ProjectResponse)
async def register_project(payload: ProjectRegisterRequest, request: Request):
    """
    Register a project with project_description and project_skills.
    The interviewer_id is automatically taken from the authenticated user (cookie).
    """
    try:
        # Convert Pydantic model to dict
        payload_dict = payload.model_dump(exclude_none=True)
        
        # Validate required fields
        project_description = payload_dict.get("project_description", "")
        project_skills = payload_dict.get("project_skills", [])
        application_deadline = payload_dict.get("application_deadline")
        
        if not project_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_description is required"
            )
        
        if not project_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_skills is required (list or string)"
            )
        
        # Get interviewer_id from the authenticated user (from cookie)
        # This depends on how your authentication middleware works
        # If you're using some auth middleware that sets req.user:
        interviewer_id = getattr(request.state, 'user_id', None) or getattr(request, 'user_id', None)
        
        # If you're using a different approach, you might need to decode the JWT from the cookie
        if not interviewer_id:
            # Try to get the token from cookies and decode it
            token = request.cookies.get("token")
            if token:
                try:
                    # Decode the JWT token to get user ID
                    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                    interviewer_id = decoded.get("userId") or decoded.get("id")
                except jwt.ExpiredSignatureError:
                    raise HTTPException(status_code=401, detail="Token expired")
                except jwt.InvalidTokenError:
                    raise HTTPException(status_code=401, detail="Invalid token")
        
        if not interviewer_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please log in."
            )
        
        # Handle project_skills if it's a string (convert to list)
        if isinstance(project_skills, str):
            # Split by comma and clean up
            project_skills = [skill.strip() for skill in project_skills.split(',') if skill.strip()]
            payload_dict["project_skills"] = project_skills
        
        # Validate application_deadline if provided
        if application_deadline:
            try:
                # Parse to ensure it's a valid ISO format datetime
                deadline_str = str(application_deadline).strip()
                # Normalize: replace Z with +00:00 for parsing
                if deadline_str.endswith('Z'):
                    deadline_str = deadline_str.replace('Z', '+00:00')
                deadline_dt = datetime.fromisoformat(deadline_str)
                
                # Ensure timezone-aware (assume UTC if naive)
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                else:
                    # Convert to UTC if not already
                    deadline_dt = deadline_dt.astimezone(timezone.utc)
                
                # Store as ISO format string in UTC with Z suffix
                payload_dict["application_deadline"] = deadline_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except (ValueError, AttributeError) as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"application_deadline must be in ISO format (e.g., '2024-12-31T23:59:59Z'). Error: {str(e)}"
                )
        
        # Generate project ID
        project_id = str(uuid4())
        payload_copy = dict(payload_dict)
        
        # Use project_heading as job_title if job_title not provided
        if not payload_copy.get("job_title") and payload_copy.get("project_heading"):
            payload_copy["job_title"] = payload_copy["project_heading"]
        
        # Add to Pinecone FIRST to get vector IDs
        pinecone_result = pinecone_vectoriser.add_project(payload_copy, project_id)
        
        if not pinecone_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add project to Pinecone: {pinecone_result.get('error', 'Unknown error')}"
            )
        
        # Now store in MongoDB WITH vector IDs and interviewer_id
        payload_copy["_id"] = project_id
        payload_copy["created_at"] = datetime.utcnow().isoformat() + "Z"
        payload_copy["vector_ids"] = pinecone_result["vector_ids"]  # Store vector IDs
        payload_copy["pinecone_metadata"] = pinecone_result["metadata"]  # Store Pinecone metadata
        payload_copy["interviewer_id"] = interviewer_id  # Store interviewer ID from cookie
        
        # Insert in MongoDB
        projects_col.insert_one(payload_copy)
        logger.info(f"Saved project to MongoDB with id: {project_id} for interviewer: {interviewer_id}")
        
        logger.info(f"Successfully registered project: {project_id} for interviewer: {interviewer_id}")
        logger.info(f"Vector IDs stored: {pinecone_result['vector_ids']}")
        
        return {
            "success": True,
            "project_id": project_id,
            "vector_ids": pinecone_result["vector_ids"],
            "message": "Project registered successfully and added to vector database"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to register project")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 11. Get Relevant Projects for Candidate (UPDATED with deadline filtering)
# ------------------------------------------------------------
# @app.get("/candidate/{candidate_id}/relevant-projects", response_model=RelevantProjectsResponse)
# async def get_relevant_projects_for_candidate(
#     candidate_id: str,
#     top_k: int = 100
# ):
#     """
#     Get relevant projects for a candidate based on their profile.
    
#     Matching logic:
#     - professional_summary + project_portfolio → project_description index
#     - skills_matrix → project_skills index
    
#     Returns ranked list of project IDs with scores. Filters out projects with past application deadlines.
#     """
#     try:
#         # Get candidate document from MongoDB
#         candidate_doc = candidates_col.find_one({"_id": candidate_id})
#         if not candidate_doc:
#             raise HTTPException(status_code=404, detail="Candidate not found")
        
#         # Get candidate's vector IDs
#         vector_ids = candidate_doc.get("vector_ids", {})
#         if not vector_ids:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Candidate vector IDs not found. Candidate may not be properly vectorized."
#             )
        
#         # Initialize retrieval pipeline
#         retrieval_pipeline = ProjectRetrievalPipeline()
        
#         # Get relevant projects
#         results = retrieval_pipeline.get_relevant_projects_for_candidate(
#             candidate_vector_ids=vector_ids,
#             top_k=top_k
#         )
        
#         # Extract project IDs from combined ranked results
#         project_results = [
#             {
#                 "project_id": result["project_id"],
#                 "overall_score": result["overall_score"],
#                 "description_score": result["description_score"],
#                 "skills_score": result["skills_score"]
#             }
#             for result in results["combined_ranked"]
#         ]
        
#         # Filter out projects with past deadlines
#         current_time = datetime.now(timezone.utc)  # Use timezone-aware UTC datetime
#         valid_projects = []
        
#         for project_result in project_results:
#             project_id = project_result["project_id"]
            
#             # Fetch project document from MongoDB to check deadline
#             project_doc = projects_col.find_one({"_id": project_id})
            
#             if not project_doc:
#                 # Project doesn't exist in MongoDB, skip it
#                 continue
            
#             # Check application_deadline
#             application_deadline = project_doc.get("application_deadline")
            
#             if application_deadline:
#                 try:
#                     # Normalize deadline string - handle various formats
#                     deadline_str = str(application_deadline).strip()
                    
#                     # Handle malformed formats like "2024-12-31T23:59:59+00:00Z"
#                     # Remove trailing 'Z' if there's already timezone offset (+XX:XX or -XX:XX)
#                     if deadline_str.endswith('Z'):
#                         # Check if there's a timezone offset pattern before the Z
#                         # Pattern: ends with +HH:MMZ or -HH:MMZ
#                         if re.search(r'[+-]\d{2}:\d{2}Z?$', deadline_str):
#                             # Has timezone offset, just remove trailing Z
#                             deadline_str = deadline_str.rstrip('Z')
#                         else:
#                             # No timezone offset, replace Z with +00:00
#                             deadline_str = deadline_str.replace('Z', '+00:00')
                    
#                     # Parse the deadline
#                     deadline_dt = datetime.fromisoformat(deadline_str)
                    
#                     # Ensure deadline is timezone-aware (if naive, assume UTC)
#                     if deadline_dt.tzinfo is None:
#                         deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                    
#                     # Only include if deadline is in the future (strictly greater than current time)
#                     if deadline_dt > current_time:
#                         valid_projects.append(project_result)
#                     # If deadline is in the past or equal to current time, skip this project
#                     else:
#                         logger.info(f"Skipping project {project_id} - deadline {application_deadline} ({deadline_dt.isoformat()}) is in the past (current: {current_time.isoformat()})")
#                 except (ValueError, AttributeError) as e:
#                     # If deadline format is invalid, log error and EXCLUDE the project
#                     # We can't verify if it's valid, so err on the side of caution
#                     logger.error(f"Invalid deadline format for project {project_id}: {application_deadline}. Error: {str(e)}. Excluding project.")
#                     # Do NOT add to valid_projects - exclude it
#             else:
#                 # No deadline specified, include the project
#                 valid_projects.append(project_result)
        
#         return {
#             "success": True,
#             "candidate_id": candidate_id,
#             "candidate_name": candidate_doc.get("name", "Unknown"),
#             "total_projects_matched": len(project_results),
#             "total_valid_projects": len(valid_projects),
#             "projects": valid_projects
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.exception(f"Failed to get relevant projects for candidate {candidate_id}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrieving relevant projects: {str(e)}"
#         )

@app.get("/api/candidate/relevant-projects")
async def get_relevant_projects_for_current_candidate(
    request: Request,
    top_k: int = 100
):
    """
    Get relevant projects for the currently logged-in candidate based on their profile.
    candidate_id is automatically extracted from cookie/JWT token.
    """
    try:
        # Try to extract user_id from request state (set by middleware)
        user_id = getattr(request.state, 'user_id', None)
        # print(f"🔍 Initial user_id from request.state: {user_id}")

        # If not found in request state, try to extract from JWT token in cookie
        if not user_id:
            token = request.cookies.get("token")
            # print(f"🔍 Token found in cookies: {bool(token)}")
            
            if token:
                try:
                    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                    # print(f"🔍 Decoded JWT payload: {decoded}")
                    
                    # Extract user_id from JWT
                    user_id = (
                        decoded.get("userId") or 
                        decoded.get("user_id") or 
                        decoded.get("id") or
                        decoded.get("userID")
                    )
                    # print(f"🔍 Extracted user_id from JWT: {user_id}")
                    
                except jwt.ExpiredSignatureError:
                    raise HTTPException(status_code=401, detail="Token expired")
                except jwt.InvalidTokenError as e:
                    print(f"❌ JWT decode error: {str(e)}")
                    raise HTTPException(status_code=401, detail="Invalid token")

        if not user_id:
            print("❌ No user_id found in request or token")
            raise HTTPException(status_code=401, detail="Authentication required")

        print(f"🔍 Final user_id being used: {user_id}")

        # ✅ FIXED: Search candidate by user_id field (which matches JWT user_id)
        candidate_doc = candidates_col.find_one({"user_id": user_id})
        
        if not candidate_doc:
            print(f"❌ Candidate not found in MongoDB for user_id: {user_id}")
            
            # Check if any candidates exist at all
            total_candidates = candidates_col.count_documents({})
            print(f"🔍 Total candidates in database: {total_candidates}")
            
            if total_candidates == 0:
                raise HTTPException(
                    status_code=404, 
                    detail="No candidate profiles found in database. Please complete your profile first."
                )
            else:
                # List available candidates for debugging
                available_candidates = list(candidates_col.find({}, {'_id': 1, 'user_id': 1, 'name': 1}))
                available_info = []
                for doc in available_candidates:
                    info = {
                        "_id": str(doc['_id']),
                        "user_id": str(doc.get('user_id', 'No user_id')),
                        "name": doc.get('name', 'Unknown')
                    }
                    available_info.append(info)
                
                print(f"🔍 Available candidates: {available_info}")
                
                raise HTTPException(
                    status_code=404, 
                    detail="Candidate profile not found. Please complete your profile setup first."
                )
        
        # print(f"✅ Candidate found: {candidate_doc.get('name', 'Unknown')} (MongoDB ID: {candidate_doc['_id']}, JWT user_id: {candidate_doc.get('user_id')})")
        
        # Get candidate's vector IDs
        vector_ids = candidate_doc.get("vector_ids", {})
        if not vector_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate vector IDs not found. Candidate profile may not be properly processed."
            )
        
        # Initialize retrieval pipeline
        retrieval_pipeline = ProjectRetrievalPipeline()
        
        # Get relevant projects
        results = retrieval_pipeline.get_relevant_projects_for_candidate(
            candidate_vector_ids=vector_ids,
            top_k=top_k
        )
        
        # Extract project IDs from combined ranked results
        project_results = [
            {
                "project_id": result["project_id"],
                "overall_score": result["overall_score"],
                "description_score": result["description_score"],
                "skills_score": result["skills_score"]
            }
            for result in results["combined_ranked"]
        ]
        
        # Filter out projects with past deadlines and fetch full project details
        current_time = datetime.now(timezone.utc)
        valid_projects = []
        
        for project_result in project_results:
            project_id = project_result["project_id"]
            
            # Fetch project document from MongoDB
            project_doc = projects_col.find_one({"_id": project_id})
            
            if not project_doc:
                continue
            
            # Check application_deadline
            application_deadline = project_doc.get("application_deadline")
            
            if application_deadline:
                try:
                    deadline_str = str(application_deadline).strip()
                    
                    if deadline_str.endswith('Z'):
                        if re.search(r'[+-]\d{2}:\d{2}Z?$', deadline_str):
                            deadline_str = deadline_str.rstrip('Z')
                        else:
                            deadline_str = deadline_str.replace('Z', '+00:00')
                    
                    deadline_dt = datetime.fromisoformat(deadline_str)
                    
                    if deadline_dt.tzinfo is None:
                        deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                    
                    if deadline_dt > current_time:
                        # Add full project details to the result
                        project_result["project_details"] = {
                            "job_title": project_doc.get("job_title"),
                            "project_description": project_doc.get("project_description"),
                            "project_skills": project_doc.get("project_skills", []),
                            "employment_type": project_doc.get("employment_type"),
                            "job_location": project_doc.get("job_location"),
                            "salary_min": project_doc.get("salary_min"),
                            "salary_max": project_doc.get("salary_max"),
                            "salary_frequency": project_doc.get("salary_frequency"),
                            "application_deadline": project_doc.get("application_deadline"),
                            "created_at": project_doc.get("created_at"),
                            "interviewer_id": project_doc.get("interviewer_id")
                        }
                        valid_projects.append(project_result)
                    else:
                        logger.info(f"Skipping project {project_id} - deadline {application_deadline} is in the past")
                except (ValueError, AttributeError) as e:
                    logger.error(f"Invalid deadline format for project {project_id}: {application_deadline}. Error: {str(e)}")
            else:
                # No deadline specified, include the project with details
                project_result["project_details"] = {
                    "job_title": project_doc.get("job_title"),
                    "project_description": project_doc.get("project_description"),
                    "project_skills": project_doc.get("project_skills", []),
                    "employment_type": project_doc.get("employment_type"),
                    "job_location": project_doc.get("job_location"),
                    "salary_min": project_doc.get("salary_min"),
                    "salary_max": project_doc.get("salary_max"),
                    "salary_frequency": project_doc.get("salary_frequency"),
                    "application_deadline": project_doc.get("application_deadline"),
                    "created_at": project_doc.get("created_at"),
                    "interviewer_id": project_doc.get("interviewer_id")
                }
                valid_projects.append(project_result)
        
        return {
            "success": True,
            "candidate_id": str(candidate_doc["_id"]),
            "user_id": str(candidate_doc.get("user_id")),
            "candidate_name": candidate_doc.get("name", "Unknown"),
            "total_projects_matched": len(project_results),
            "total_valid_projects": len(valid_projects),
            "projects": valid_projects
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch candidate relevant projects")
        raise HTTPException(status_code=500, detail=str(e))  
# 12. Get Project by ID (NEW)
# ------------------------------------------------------------
@app.get("/api/project/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """
    Retrieve project information by project ID.
    """
    doc = projects_col.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Convert ObjectId to string for JSON serialization if present
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    
    return {
        "success": True, 
        "project": doc,
        "vector_ids": doc.get("vector_ids", {})
    }


# ------------------------------------------------------------
# 13. Update Project (NEW)
# ------------------------------------------------------------
@app.put("/project/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, payload: ProjectUpdateRequest):
    """
    Update project JSON and update Pinecone.
    All fields are optional - only provided fields will be updated.
    """
    try:
        # Check if project exists
        existing_doc = projects_col.find_one({"_id": project_id})
        if not existing_doc:
            raise HTTPException(status_code=404, detail="Project not found")

        # Convert Pydantic model to dict, excluding None values
        payload_dict = payload.model_dump(exclude_none=True)
        
        # Merge with existing document - use provided values or keep existing ones
        project_description = payload_dict.get("project_description", existing_doc.get("project_description", ""))
        project_skills = payload_dict.get("project_skills", existing_doc.get("project_skills", []))
        
        if not project_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_description is required"
            )
        
        if not project_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_skills is required (list or string)"
            )

        # Validate application_deadline if provided
        application_deadline = payload_dict.get("application_deadline")
        if application_deadline:
            try:
                # Parse to ensure it's a valid ISO format datetime
                deadline_str = str(application_deadline).strip()
                # Normalize: replace Z with +00:00 for parsing
                if deadline_str.endswith('Z'):
                    deadline_str = deadline_str.replace('Z', '+00:00')
                deadline_dt = datetime.fromisoformat(deadline_str)
                
                # Ensure timezone-aware (assume UTC if naive)
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                else:
                    # Convert to UTC if not already
                    deadline_dt = deadline_dt.astimezone(timezone.utc)
                
                # Store as ISO format string in UTC with Z suffix
                payload_dict["application_deadline"] = deadline_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except (ValueError, AttributeError) as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"application_deadline must be in ISO format (e.g., '2024-12-31T23:59:59Z'). Error: {str(e)}"
                )

        # Merge payload_dict with existing document for complete update
        # Only update fields that were provided, keep others from existing_doc
        update_data = {**existing_doc, **payload_dict}
        # Ensure required fields are present
        update_data["project_description"] = project_description
        update_data["project_skills"] = project_skills

        # Update in Pinecone (only send project_description and project_skills)
        pinecone_payload = {
            "project_description": project_description,
            "project_skills": project_skills
        }
        pinecone_result = pinecone_vectoriser.update_project(pinecone_payload, project_id)
        
        if not pinecone_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update project in Pinecone: {pinecone_result.get('error', 'Unknown error')}"
            )

        # Update MongoDB document
        payload_copy = dict(update_data)
        payload_copy["_id"] = project_id
        payload_copy["updated_at"] = datetime.utcnow().isoformat() + "Z"
        payload_copy["vector_ids"] = pinecone_result["vector_ids"]  # Update vector IDs
        payload_copy["pinecone_metadata"] = pinecone_result["metadata"]  # Update metadata
        # Preserve created_at if it exists
        if "created_at" in existing_doc:
            payload_copy["created_at"] = existing_doc["created_at"]

        projects_col.replace_one({"_id": project_id}, payload_copy, upsert=True)

        logger.info(f"Successfully updated project: {project_id}")
        logger.info(f"Updated vector IDs: {pinecone_result['vector_ids']}")

        return {
            "success": True, 
            "project_id": project_id,
            "vector_ids": pinecone_result["vector_ids"],
            "message": "Project updated successfully in vector database"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update project")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 14. Delete Project (NEW)
# ------------------------------------------------------------
@app.delete("/project/{project_id}")
async def delete_project(project_id: str):
    """
    Delete project and remove from Pinecone.
    """
    try:
        # Get project first to log vector IDs
        project = projects_col.find_one({"_id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Delete from MongoDB
        result = projects_col.delete_one({"_id": project_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")

        # Delete from Pinecone using stored vector IDs
        vector_ids = project.get("vector_ids", {})
        logger.info(f"Deleting project {project_id} with vector IDs: {vector_ids}")
        
        success = pinecone_vectoriser.delete_project(project_id)
        
        if not success:
            logger.warning(f"Failed to delete project {project_id} from Pinecone")

        return {
            "success": True, 
            "message": "Project deleted successfully",
            "deleted_vector_ids": vector_ids
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to delete project")
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# 15. Get ranked candidates for project (UPDATED)
# ------------------------------------------------------------

@app.post("/get-ranked-candidates", response_model=GetRankedCandidatesResponse)
async def get_ranked_candidates(request: GetRankedCandidatesRequest):
    """
    Get ranked candidates based on project ID.
    Fetches project data from MongoDB and uses project_description and project_skills for matching.
    Returns top_k ranked candidates.
    """
    try:
        # Extract fields from request
        project_id = request.project_id
        top_k = request.top_k
        # Convert filters to dict, keeping None values for filters that should be ignored
        filters = request.filters.model_dump() if request.filters else {}
        
        # Fetch project from MongoDB
        project_doc = projects_col.find_one({"_id": project_id})
        if not project_doc:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Extract project description and skills
        project_description = project_doc.get("project_description", "")
        project_skills_raw = project_doc.get("project_skills", [])
        
        # Handle project_skills - can be list or string
        if isinstance(project_skills_raw, str):
            # Convert comma-separated string to list
            required_skills = [skill.strip() for skill in project_skills_raw.split(",") if skill.strip()]
        elif isinstance(project_skills_raw, list):
            required_skills = [str(skill).strip() for skill in project_skills_raw if skill]
        else:
            required_skills = []
        
        if not project_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project description not found in project data"
            )
        
        if not required_skills:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project skills not found in project data"
            )
        
        # Initialize the retrieval pipeline
        retrieval_pipeline = CandidateRetrievalPipeline()
        
        # Retrieve ranked candidates (this returns all candidates, not just top-k)
        results = retrieval_pipeline.retrieve_ranked_candidates(
            project_description=project_description,
            required_skills=required_skills,
            filters=filters
        )
        
        # Limit to top_k results
        combined_results = results["combined_ranked"][:top_k]
        
        # Return only the combined ranked results (top_k)
        return {
            "success": True,
            "project_id": project_id,
            "project_description": project_description,
            "required_skills": required_skills,
            "filters_applied": filters,
            "top_k": top_k,
            "results_count": {
                "professional_summary": len(results["professional_summary_ranked"]),
                "project_portfolio": len(results["project_portfolio_ranked"]),
                "skills_matrix": len(results["skills_matrix_ranked"]),
                "combined_total": len(results["combined_ranked"]),
                "combined_returned": len(combined_results)
            },
            "combined_ranked_results": combined_results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get ranked candidates")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving ranked candidates: {str(e)}"
        )


# ------------------------------------------------------------
# 16. Get All Projects under an Interviewer 
# ------------------------------------------------------------

@app.get("/api/get-my-projects")
async def get_my_projects(request: Request):
    """
    Fetch all projects created by the logged-in interviewer.
    interviewer_id is automatically extracted from cookie/JWT token.
    """
    try:
        # Try to extract interviewer_id from request or cookie (same as register-project)
        interviewer_id = getattr(request.state, 'user_id', None) or getattr(request, 'user_id', None)

        # Try to decode from cookie if not found
        if not interviewer_id:
            token = request.cookies.get("token")
            if token:
                try:
                    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                    interviewer_id = decoded.get("userId") or decoded.get("id")
                except jwt.ExpiredSignatureError:
                    raise HTTPException(status_code=401, detail="Token expired")
                except jwt.InvalidTokenError:
                    raise HTTPException(status_code=401, detail="Invalid token")

        if not interviewer_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Fetch all projects from MongoDB for that interviewer
        projects = list(projects_col.find({"interviewer_id": interviewer_id}))

        # Convert ObjectId to string and format response
        for project in projects:
            project["_id"] = str(project["_id"])

        if not projects:
            return {"message": "No projects found for this interviewer", "projects": []}

        return {
            "success": True,
            "count": len(projects),
            "projects": projects
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch interviewer projects")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

