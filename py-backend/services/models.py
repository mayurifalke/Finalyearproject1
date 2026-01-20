"""
Pydantic Models for API Request/Response Schemas
These models define the JSON schemas visible in FastAPI /docs
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


# ============================================================
# PROJECT MODELS
# ============================================================

# class ProjectRegisterRequest(BaseModel):
#     """Schema for registering a new project"""
#     project_description: str = Field(
#         ..., 
#         description="Description of the project", 
#         min_length=1
#     )
#     project_skills: Union[List[str], str] = Field(
#         ..., 
#         description="List of required skills for the project (can be list or comma-separated string)", 
#         min_items=1
#     )
#     project_heading: Optional[str] = Field(
#         None, 
#         description="Short heading/title for the project (stored in MongoDB only, not in Pinecone)"
#     )
#     application_deadline: Optional[str] = Field(
#         None, 
#         description="Application deadline in ISO format (e.g., '2024-12-31T23:59:59Z')"
#     )
    
#     class Config:
#         json_schema_extra = {
#             "example": {
#                 "project_heading": "Full-Stack Developer Position",
#                 "project_description": "We are looking for a full-stack developer to build a modern web application using React and Node.js. The project involves creating a real-time collaboration platform with features like live editing, chat, and file sharing.",
#                 "project_skills": ["React", "Node.js", "MongoDB", "WebSocket", "TypeScript", "Express"],
#                 "application_deadline": "2025-12-31T23:59:59Z"
#             }
#         }

from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime

class ProjectRegisterRequest(BaseModel):
    """Schema for registering a new project"""
    project_description: str = Field(
        ..., 
        description="Description of the project", 
        min_length=1
    )
    project_skills: Union[List[str], str] = Field(
        ..., 
        description="List of required skills for the project (can be list or comma-separated string)", 
        min_items=1
    )
    project_heading: Optional[str] = Field(
        None, 
        description="Short heading/title for the project (stored in MongoDB only, not in Pinecone)"
    )
    application_deadline: Optional[str] = Field(
        None, 
        description="Application deadline in ISO format (e.g., '2024-12-31T23:59:59Z')"
    )
    interviewer_id: Optional[str] = Field(
        None,
        description="ID of the interviewer creating the project",
        # min_length=1
    )
    job_title: Optional[str] = Field(
        None,
        description="Job title for the position"
    )
    employment_type: Optional[str] = Field(
        None,
        description="Type of employment (e.g., full-time, part-time, contract)"
    )
    job_location: Optional[str] = Field(
        None,
        description="Job location (e.g., Remote, New York, NY)"
    )
    salary_min: Optional[float] = Field(
        None,
        description="Minimum salary for the position"
    )
    salary_max: Optional[float] = Field(
        None,
        description="Maximum salary for the position"
    )
    salary_frequency: Optional[str] = Field(
        None,
        description="Salary frequency (e.g., annually, monthly, hourly)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_heading": "Full-Stack Developer Position",
                "project_description": "We are looking for a full-stack developer to build a modern web application using React and Node.js. The project involves creating a real-time collaboration platform with features like live editing, chat, and file sharing.",
                "project_skills": ["React", "Node.js", "MongoDB", "WebSocket", "TypeScript", "Express"],
                "application_deadline": "2025-12-31T23:59:59Z",
                "interviewer_id": "12345",
                "job_title": "Senior Full-Stack Developer",
                "employment_type": "full-time",
                "job_location": "Remote",
                "salary_min": 70000,
                "salary_max": 95000,
                "salary_frequency": "annually"
            }
        }

class ProjectUpdateRequest(BaseModel):
    """Schema for updating an existing project"""
    project_description: Optional[str] = Field(
        None, 
        description="Description of the project", 
        min_length=1
    )
    project_skills: Optional[Union[List[str], str]] = Field(
        None, 
        description="List of required skills for the project (can be list or comma-separated string)", 
        min_items=1
    )
    project_heading: Optional[str] = Field(
        None, 
        description="Short heading/title for the project (stored in MongoDB only, not in Pinecone)"
    )
    application_deadline: Optional[str] = Field(
        None, 
        description="Application deadline in ISO format (e.g., '2024-12-31T23:59:59Z')"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_heading": "Updated Full-Stack Developer Position",
                "project_description": "Updated description for the project",
                "project_skills": ["React", "Node.js", "TypeScript"],
                "application_deadline": "2025-12-31T23:59:59Z"
            }
        }


class ProjectResponse(BaseModel):
    """Schema for project response"""
    success: bool
    project_id: Optional[str] = None
    vector_ids: Optional[Dict[str, str]] = None
    message: Optional[str] = None
    project: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "project_id": "c33b3d28-9508-42b8-b869-5076c94e121e",
                "vector_ids": {
                    "project_description": "proj_desc_c33b3d28-9508-42b8-b869-5076c94e121e",
                    "project_skills": "proj_skills_c33b3d28-9508-42b8-b869-5076c94e121e"
                },
                "message": "Project registered successfully and added to vector database"
            }
        }


# ============================================================
# CANDIDATE MODELS
# ============================================================

class SocialLinks(BaseModel):
    """Social media links"""
    github: Optional[str] = Field(None, description="GitHub profile URL")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    portfolio: Optional[str] = Field(None, description="Portfolio website URL")


class Education(BaseModel):
    """Education entry"""
    name: str = Field(..., description="Institution name")
    qualification: str = Field(..., description="Degree or qualification name")
    category: str = Field(
        ..., 
        description="Education category: Secondary Education, Higher Secondary, Undergraduate, Post Graduate, Diploma / Vocational Education, Other / Unknown"
    )
    start: Optional[str] = Field(None, description="Start date as it appears in resume")
    end: Optional[str] = Field(None, description="End date as it appears in resume (use 'Present' if current)")
    marks: Optional[str] = Field(None, description="Marks/percentage (numerical only)")


class Project(BaseModel):
    """Project entry"""
    title: Optional[str] = Field(None, description="Project title")
    description: str = Field(..., description="Project description")
    project_skills: Optional[List[str]] = Field(None, description="Skills used in the project")


class Experience(BaseModel):
    """Work experience entry"""
    company_name: str = Field(..., description="Company name")
    designation: str = Field(..., description="Job title/designation")
    description: str = Field(..., description="Summary of responsibilities and achievements")
    experiance_skills: Optional[List[str]] = Field(None, description="Skills used in this role")
    start: str = Field(..., description="Start date EXACTLY as it appears in resume")
    end: str = Field(..., description="End date EXACTLY as it appears in resume (use 'Present' if current)")


class CandidateRegisterRequest(BaseModel):
    """Schema for registering a new candidate"""
    name: str = Field(..., description="Candidate's full name", min_length=1)
    phone: Optional[str] = Field(None, description="Phone number")
    mail: Optional[str] = Field(None, description="Email address")
    social: Optional[SocialLinks] = Field(None, description="Social media links")
    education: List[Education] = Field(default_factory=list, description="Education history")
    skills: List[str] = Field(default_factory=list, description="List of skills")
    projects: List[Project] = Field(default_factory=list, description="Project portfolio")
    experience: List[Experience] = Field(default_factory=list, description="Work experience")
    certifications: List[str] = Field(default_factory=list, description="List of certifications")
    achievements: List[str] = Field(default_factory=list, description="List of achievements")
    professional_summary: Optional[str] = Field(None, description="Professional summary/bio")
    total_experience_years: Optional[float] = Field(None, description="Total years of experience")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "phone": "+1234567890",
                "mail": "john.doe@example.com",
                "social": {
                    "github": "https://github.com/johndoe",
                    "linkedin": "https://linkedin.com/in/johndoe",
                    "portfolio": "https://johndoe.dev"
                },
                "education": [
                    {
                        "name": "University of Technology",
                        "qualification": "Bachelor of Science in Computer Science",
                        "category": "Undergraduate",
                        "start": "2018",
                        "end": "2022",
                        "marks": "85.5"
                    }
                ],
                "skills": ["Python", "JavaScript", "React", "Node.js", "MongoDB"],
                "projects": [
                    {
                        "title": "E-commerce Platform",
                        "description": "Built a full-stack e-commerce platform with React and Node.js",
                        "project_skills": ["React", "Node.js", "MongoDB", "Express"]
                    }
                ],
                "experience": [
                    {
                        "company_name": "Tech Corp",
                        "designation": "Software Engineer",
                        "description": "Developed and maintained web applications",
                        "experiance_skills": ["Python", "Django", "PostgreSQL"],
                        "start": "2022-06",
                        "end": "Present"
                    }
                ],
                "certifications": ["AWS Certified Developer", "Google Cloud Professional"],
                "achievements": ["Best Employee Award 2023"],
                "professional_summary": "Experienced software engineer with 2+ years of experience",
                "total_experience_years": 2.5
            }
        }


class CandidateUpdateRequest(BaseModel):
    """Schema for updating an existing candidate (all fields optional)"""
    name: Optional[str] = Field(None, description="Candidate's full name", min_length=1)
    phone: Optional[str] = Field(None, description="Phone number")
    mail: Optional[str] = Field(None, description="Email address")
    social: Optional[SocialLinks] = Field(None, description="Social media links")
    education: Optional[List[Education]] = Field(None, description="Education history")
    skills: Optional[List[str]] = Field(None, description="List of skills")
    projects: Optional[List[Project]] = Field(None, description="Project portfolio")
    experience: Optional[List[Experience]] = Field(None, description="Work experience")
    certifications: Optional[List[str]] = Field(None, description="List of certifications")
    achievements: Optional[List[str]] = Field(None, description="List of achievements")
    professional_summary: Optional[str] = Field(None, description="Professional summary/bio")
    total_experience_years: Optional[float] = Field(None, description="Total years of experience")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe Updated",
                "skills": ["Python", "JavaScript", "React", "Node.js", "MongoDB", "TypeScript"]
            }
        }


class CandidateResponse(BaseModel):
    """Schema for candidate response"""
    success: bool
    candidate_id: Optional[str] = None
    vector_ids: Optional[Dict[str, str]] = None
    message: Optional[str] = None
    candidate: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "candidate_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "vector_ids": {
                    "professional_summary": "prof_sum_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "skills_matrix": "skills_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "project_portfolio": "proj_port_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                "message": "Candidate registered successfully and added to vector database"
            }
        }


# ============================================================
# RETRIEVAL MODELS
# ============================================================

class CandidateFilters(BaseModel):
    """Filters for candidate search"""
    has_leadership: Optional[bool] = Field(
        None, 
        description="Filter by leadership experience (true/false/null to ignore)"
    )
    highest_education: Optional[str] = Field(
        None, 
        description="Filter by highest education level (null to ignore)"
    )
    seniority_level: Optional[str] = Field(
        None, 
        description="Filter by seniority level (null to ignore)"
    )


class GetRankedCandidatesRequest(BaseModel):
    """Schema for getting ranked candidates for a project"""
    project_id: str = Field(..., description="ID of the project to match candidates against")
    top_k: int = Field(100, description="Number of top candidates to return", ge=1, le=1000)
    filters: CandidateFilters = Field(
        default_factory=lambda: CandidateFilters(),
        description="Filters for candidate search (use null for any filter to ignore it)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "c33b3d28-9508-42b8-b869-5076c94e121e",
                "top_k": 10,
                "filters": {
                    "has_leadership": None,
                    "highest_education": "Undergraduate",
                    "seniority_level": "Junior"
                }
            }
        }


class RankedCandidate(BaseModel):
    """Schema for a ranked candidate result"""
    candidate_id: str
    name: str
    overall_score: float
    professional_score: float
    project_score: float
    skills_score: float
    seniority_level: Optional[str] = None
    highest_education: Optional[str] = None
    has_leadership: Optional[bool] = None


class GetRankedCandidatesResponse(BaseModel):
    """Schema for ranked candidates response"""
    success: bool
    project_id: str
    project_description: str
    required_skills: List[str]
    filters_applied: Dict[str, Any]
    top_k: int
    results_count: Dict[str, int]
    combined_ranked_results: List[RankedCandidate]


class ProjectScore(BaseModel):
    """Schema for project score in relevant projects"""
    project_id: str
    overall_score: float
    description_score: float
    skills_score: float


class RelevantProjectsResponse(BaseModel):
    """Schema for relevant projects response"""
    success: bool
    candidate_id: str
    candidate_name: str
    total_projects_matched: int
    total_valid_projects: int
    projects: List[ProjectScore]


# ============================================================
# PARSE RESUME MODELS
# ============================================================

class ParseResumeResponse(BaseModel):
    """Schema for parse resume response"""
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None
    text_length: Optional[int] = None
    parsed_data: Optional[Dict[str, Any]] = None


# ============================================================
# CANDIDATE SUMMARY MODELS
# ============================================================

class HighestQualification(BaseModel):
    """Highest qualification details"""
    qualification: str
    category: str


class ProjectSummary(BaseModel):
    """Project summary"""
    description: str
    project_skills: List[str]


class ExperienceSummary(BaseModel):
    """Experience summary"""
    designation: str
    description: str
    experience_skills: List[str]


class CandidateSummaryResponse(BaseModel):
    """Schema for candidate summary response"""
    highest_qualification: HighestQualification
    projects: List[ProjectSummary]
    experience: List[ExperienceSummary]
    certifications: List[str]


# ============================================================
# VECTOR IDS MODELS
# ============================================================

class CandidateVectorsResponse(BaseModel):
    """Schema for candidate vectors response"""
    success: bool
    candidate_id: str
    vector_ids: Dict[str, str]
    name: str

