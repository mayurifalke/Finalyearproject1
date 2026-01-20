// src/components/CustomSignUp.jsx
import { useSignUp } from "@clerk/clerk-react";
import { useState } from "react";

export const CustomSignUp = ({ selectedRole, companyName, onSuccess }) => {
  const { isLoaded, signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      // Prepare metadata
      const metadata = { user_type: selectedRole };
      if (selectedRole === "interviewer" && companyName) {
        metadata.company_name = companyName;
      }

      console.log("Creating user with metadata:", metadata);

      // Start the sign-up process with metadata
      await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: metadata, // This will become publicMetadata
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
      
    } catch (err) {
      console.error("Sign up creation error:", err);
      alert(err.errors[0].message);
    }
  };

  // Handle verification
  const handleVerification = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        console.log("Sign up successful");
        console.log("User metadata:", completeSignUp.createdUserId);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Verification error:", err);
      alert(err.errors[0].message);
    }
  };

  if (pendingVerification) {
    return (
      <div className="verification-container">
        <h3>Verify Your Email</h3>
        <p>We've sent a verification code to {email}</p>
        <form onSubmit={handleVerification}>
          <input
            value={code}
            placeholder="Enter verification code"
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit">Verify Email</button>
        </form>
      </div>
    );
  }

  return (
    <div className="signup-form">
      <h3>Create your {selectedRole} account</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Continue</button>
      </form>
    </div>
  );
};