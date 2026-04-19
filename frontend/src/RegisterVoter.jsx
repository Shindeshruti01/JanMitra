import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function RegisterVoter() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    Voter_ID: "",
    Name: "",
    Age: "",
    DOB: "",
    Gender: "",
    City: "",
    State: "",
    Address: "",
    Aadhar: "",
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://127.0.0.1:5000/api/register-voter", formData);
      setMessage(res.data.message);

      setTimeout(() => {
        navigate("/login/voter");
      }, 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>New Voter Registration</h2>

      <form onSubmit={handleRegister}>
        <input name="Voter_ID" placeholder="Voter ID" onChange={handleChange} required /><br /><br />
        <input name="Name" placeholder="Name" onChange={handleChange} required /><br /><br />
        <input name="Age" type="number" placeholder="Age" onChange={handleChange} required /><br /><br />
        <input name="DOB" type="date" onChange={handleChange} required /><br /><br />

        <select name="Gender" onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select><br /><br />

        <input name="City" placeholder="City" onChange={handleChange} required /><br /><br />
        <input name="State" placeholder="State" onChange={handleChange} required /><br /><br />
        <textarea name="Address" placeholder="Address" onChange={handleChange} required /><br /><br />
        <input name="Aadhar" placeholder="Aadhar" onChange={handleChange} required /><br /><br />
        <input name="username" placeholder="Create Username" onChange={handleChange} required /><br /><br />
        <input name="password" type="password" placeholder="Create Password" onChange={handleChange} required /><br /><br />

        <button type="submit">Register</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default RegisterVoter;