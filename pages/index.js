import { useState } from "react";
import "../public/styles.css";

export default function Home() {
  const [name, setName] = useState("");
  const [likes, setLikes] = useState("");
  const [language, setLanguage] = useState("English");
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setPassport(null);
    try {
      const res = await fetch("/api/passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, likes, language }),
      });
      const data = await res.json();
      setPassport(data);
    } catch (err) {
      console.error(err);
      alert("Error generating passport");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Intergalactic Passport</h1>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Likes" value={likes} onChange={e => setLikes(e.target.value)} />
      <select value={language} onChange={e => setLanguage(e.target.value)}>
        <option>English</option>
        <option>Spanish</option>
        <option>French</option>
      </select>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate ID"}
      </button>

      {passport && (
        <div className="passport">
          <h2>{passport.name}</h2>
          <img src={passport.imageUrl} alt="Passport" />
          <pre>{JSON.stringify(passport, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
