import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    likes: '',
    language: 'en'
  });
  const [loading, setLoading] = useState(false);
  const [passportData, setPassportData] = useState(null);
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [twitterLink, setTwitterLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setShowResult(false);
    setTwitterLink('');
    setError('');
    setLoading(true);

    setTimeout(async () => {
      try {
        const passportResponse = await fetch('/api/passport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!passportResponse.ok) {
          const err = await passportResponse.json();
          throw new Error(`Passport generation failed: ${err.details || passportResponse.statusText}`);
        }

        const passportData = await passportResponse.json();
        setPassportData(passportData);
        setShowResult(true);

        // Esperar un poco para que se renderice el passport
        await new Promise(resolve => setTimeout(resolve, 100));

        // Generar imagen y link de Twitter
        const html2canvas = (await import('html2canvas')).default;
        const passportCard = document.querySelector('.passport-card');
        
        if (passportCard) {
          const canvas = await html2canvas(passportCard, { 
            useCORS: true, 
            backgroundColor: null 
          });
          const imageData = canvas.toDataURL('image/png');

          const saveImageResponse = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData }),
          });

          if (!saveImageResponse.ok) {
            const err = await saveImageResponse.json();
            throw new Error(`Image saving failed: ${err.error || saveImageResponse.statusText}`);
          }

          const { url: savedImageUrl } = await saveImageResponse.json();
          const fullShareImageUrl = `${window.location.origin}${savedImageUrl}`;
          const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(passportData.tweet_text)}&url=${encodeURIComponent(fullShareImageUrl)}`;
          setTwitterLink(twitterLink);
        }
      } catch (error) {
        console.error('Caught Error:', error);
        setError(`SYSTEM ERROR: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, 50);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    if (passportData && passportData.theme && passportData.theme.colors) {
      const passportCard = document.querySelector('.passport-card');
      if (passportCard) {
        passportCard.style.setProperty('--accent-color', passportData.theme.colors.accent1);
        passportCard.style.setProperty('--glow-color', passportData.theme.colors.glow);
        passportCard.style.setProperty('--scanline-color-1', passportData.theme.colors.bg1);
        passportCard.style.setProperty('--scanline-color-2', passportData.theme.colors.bg2);
      }
    }
  }, [passportData]);

  return (
    <>
      <Head>
        <title>Intergalactic Passport Terminal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Roboto+Mono:wght@400;700&display=swap" 
          rel="stylesheet" 
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      </Head>

      <div className="container">
        <header>
          <h1>[ Intergalactic Passport Terminal ]</h1>
        </header>
        
        <form id="passport-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">&gt; USER FULL NAME:</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="likes">&gt; LIKES/INTERESTS (CSV):</label>
            <input 
              type="text" 
              id="likes" 
              name="likes" 
              value={formData.likes}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="language">&gt; DATA LANGUAGE:</label>
            <select 
              id="language" 
              name="language" 
              value={formData.language}
              onChange={handleInputChange}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
            </select>
          </div>
          
          <button type="submit" id="submit-btn" disabled={loading}>
            -- GENERATE ID --
          </button>
        </form>

        <div id="loader" className={`loader ${!loading ? 'hidden' : ''}`}>
          <div className="spinner"></div>
          <p>&gt; PROCESSING REQUEST...</p>
        </div>

        <div id="error-message" className={`error-message ${!error ? 'hidden' : ''}`}>
          {error}
        </div>

        <div id="passport-result" className={!showResult ? 'hidden' : ''}>
          <div className="passport-card">
            <div className="passport-background"></div>
            <div className="passport-identity">
              <div className="passport-photo">
                <img id="passport-image" src="placeholder.png" alt="ID Photo" />
              </div>
              <div id="passport-stamp-container">
                {passportData?.passport_stamp_svg && (
                  <div dangerouslySetInnerHTML={{ __html: passportData.passport_stamp_svg }} />
                )}
              </div>
            </div>
            <div className="passport-info">
              <header className="passport-header grid-span-2">
                <h3 id="passport-name">{passportData?.name}</h3>
                <p id="passport-space-name">{passportData?.space_name}</p>
              </header>
              
              <div className="detail-item">
                <strong id="label-planet">{passportData?.labels?.planet_label}</strong>
                <span id="passport-planet">{passportData?.planet_of_origin}</span>
              </div>
              <div className="detail-item">
                <strong id="label-species">{passportData?.labels?.species_label}</strong>
                <span id="passport-species">{passportData?.species}</span>
              </div>
              
              <div className="detail-item">
                <strong id="label-occupation">{passportData?.labels?.occupation_label}</strong>
                <span id="passport-occupation">{passportData?.occupation}</span>
              </div>
              <div></div>

              <div className="detail-item">
                <strong id="label-reg-number">{passportData?.labels?.reg_number_label}</strong>
                <span id="passport-reg-number">{passportData?.registration_number}</span>
              </div>
              <div></div>

              <div className="detail-item">
                <strong id="label-tagline">{passportData?.labels?.tagline_label}</strong>
                <span id="passport-tagline">{passportData?.profile_tagline}</span>
              </div>
              <div className="detail-item">
                <strong id="label-restrictions">{passportData?.labels?.restrictions_label}</strong>
                <span id="passport-restrictions">{passportData?.restrictions}</span>
              </div>
            </div>
          </div>
          
          {twitterLink && (
            <a 
              id="twitter-share-btn" 
              href={twitterLink} 
              target="_blank" 
              className="share-btn"
              rel="noopener noreferrer"
            >
              &gt; TRANSMIT ID TO X-COMMS
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Intergalactic Passport - Frontend Styles (FINAL ANIMATION FIX) */
        :root {
          --accent-color: #00ff7f; 
          --glow-color: rgba(0, 255, 127, 0.7); 
          --scanline-color-1: rgba(0, 50, 0, 0.3); 
          --scanline-color-2: rgba(10, 30, 10, 0.3);
          --primary-color: #050608; 
          --secondary-color: #11131a; 
          --text-color: #c7d3d7; 
          --border-color: #2a3c42; 
          --font-primary: 'Orbitron', sans-serif; 
          --font-mono: 'Roboto Mono', monospace;
        }

        :global(body) { 
          background-color: var(--primary-color); 
          color: var(--text-color); 
          font-family: var(--font-mono); 
          margin: 0; 
          padding: 20px; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          min-height: 100vh; 
        }

        .container { 
          width: 100%; 
          max-width: 850px; 
          background-color: var(--secondary-color); 
          border: 1px solid var(--border-color); 
          border-radius: 4px; 
          padding: 30px; 
        }

        header h1 { 
          font-family: var(--font-primary); 
          color: var(--accent-color); 
          text-shadow: 0 0 8px var(--glow-color); 
          text-align: center; 
          letter-spacing: 2px; 
        }

        #passport-form { 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          margin-top: 30px; 
        } 

        .form-group label { 
          text-transform: uppercase; 
          letter-spacing: 1px; 
        } 

        input, select { 
          background-color: #000; 
          border: 1px solid var(--border-color); 
          border-radius: 2px; 
          color: var(--text-color); 
          padding: 10px; 
          font-family: var(--font-mono); 
        } 

        button[type="submit"] { 
          background-color: var(--accent-color); 
          border: 1px solid var(--accent-color); 
          color: #000; 
          cursor: pointer; 
          font-family: var(--font-primary); 
          font-size: 1.1em; 
          padding: 12px; 
          transition: all 0.3s; 
        } 

        button[type="submit"]:hover { 
          background-color: var(--primary-color); 
          color: var(--accent-color); 
        }

        .passport-card {
          position: relative; 
          background-color: transparent; 
          border: 1px solid var(--accent-color);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.7), 0 0 15px var(--glow-color);
          padding: 20px; 
          display: grid; 
          grid-template-columns: 180px 1fr; 
          gap: 25px; 
          transition: all 0.5s ease;
          overflow: hidden;
        }

        .passport-background {
          position: absolute; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          z-index: 0;
          background-color: var(--primary-color);
          background-image:
            linear-gradient(to right, var(--scanline-color-1) 1px, transparent 1px),
            linear-gradient(to bottom, var(--scanline-color-1) 1px, transparent 1px),
            repeating-linear-gradient(to bottom, transparent, transparent 2px, var(--scanline-color-2) 2px, var(--scanline-color-2) 3px);
          background-size: 20px 20px, 20px 20px, 100% 100%;
        }

        .passport-identity, .passport-info { 
          position: relative; 
          z-index: 1; 
        }

        .passport-identity { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 15px; 
        }

        .passport-photo { 
          width: 160px; 
          height: 160px; 
          border: 2px solid var(--accent-color); 
          background-color: #fff; 
          padding: 4px; 
          box-shadow: 0 0 10px var(--glow-color); 
        }

        .passport-photo img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          filter: grayscale(1) contrast(1.1); 
        }

        #passport-stamp-container { 
          width: 120px; 
          height: 120px; 
          opacity: 0.8; 
        } 

        #passport-stamp-container :global(svg) { 
          width: 100%; 
          height: 100%; 
        }

        .passport-info { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          grid-template-rows: auto; 
          gap: 15px 25px; 
          align-content: start; 
        }

        .grid-span-2 { 
          grid-column: span 2; 
        }

        .passport-header h3 { 
          font-family: var(--font-primary); 
          font-size: 2.5em; 
          color: #fff; 
          margin: 0; 
          line-height: 1; 
        }

        .passport-header p { 
          font-size: 1.2em; 
          color: var(--accent-color); 
          margin: 0; 
        }

        .detail-item strong { 
          display: block; 
          font-size: 0.8em; 
          color: var(--accent-color); 
          text-transform: uppercase; 
          letter-spacing: 1px; 
          margin-bottom: 5px; 
          opacity: 0.7; 
        }

        .detail-item span { 
          font-size: 1em; 
          color: var(--text-color); 
          overflow-wrap: break-word; 
          word-break: break-word; 
        }

        .error-message { 
          color: #ff4500; 
          border: 1px solid #ff4500; 
          background-color: rgba(255, 69, 0, 0.1); 
          padding: 10px; 
          margin-top: 20px; 
          text-align: center; 
          border-radius: 4px; 
          font-family: var(--font-mono); 
        }

        .hidden { 
          display: none; 
        } 

        .loader { 
          text-align: center; 
          margin-top: 20px; 
        } 

        .spinner { 
          border: 3px solid #333; 
          border-left-color: var(--accent-color); 
          border-radius: 50%; 
          width: 30px; 
          height: 30px; 
          margin: 0 auto;
          animation: spin 1s linear infinite;
        } 

        .share-btn { 
          display: block; 
          width: fit-content; 
          margin: 20px auto 0; 
          background-color: #1DA1F2; 
          color: white; 
          padding: 10px 20px; 
          text-decoration: none; 
          border-radius: 4px; 
          font-family: var(--font-primary); 
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) { 
          .passport-card { 
            grid-template-columns: 1fr; 
          } 
          .passport-identity { 
            flex-direction: row; 
          } 
        }
      `}</style>
    </>
  );
}
