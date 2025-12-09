import React, { useState, useEffect } from 'react';
import './AdComponent.css';
import tobagoImage from '/src/components/AdComponent/tobago.jpg';
import voyagesImage from '/src/components/AdComponent/voyages1.png';
import siLogo from '/src/components/AdComponent/SI-logo.png';
import fishImage from '/src/components/AdComponent/fish.jpg';
import voyagesImage2 from '/src/components/AdComponent/voyages2.jpg';
const AdComponent = () => {
  const [currentAd, setCurrentAd] = useState(0);

  const ads = [
    
    {
      id: 1,
      title: "Aquadeep Tobago Tours",
      description: "Discover amazing travel adventures and scuba diving experiences in Tobago with Aquadeep Tours.",
      image: tobagoImage,
      link: "https://scuba-web-app.web.app/",
      cta: "Explore"
    },
    {
      id: 2,
      title: "The Voyages of Victoria: Novel Series",
      description: "Embark on a thrilling adventure with Captain Bartley and his eclectic crew.",
      image: voyagesImage,
      link: "https://voyagesofvictora.com/",
      cta: "Read More"
    },
    {
      id: 3,
      title: "Simply Invoicing - A Fevco Product",
      description: "Online invoice generator with Google authentication. Create, manage, and send professional invoices instantly. Mobile-friendly invoicing app with PDF export and client management.",
      image: siLogo,
      link: "https://feveck-invoice.web.app",
      cta: "Check It Out"
    },{
      id: 4,
      title: "Aquadeep Tobago Tours",
      description: "Discover amazing travel adventures and scuba diving experiences in Tobago with Aquadeep Tours.",
      image: fishImage,
      link: "https://scuba-web-app.web.app/",
      cta: "Explore"
    },{
      id: 5,
      title: "The Voyages of Victoria: Novel Series",
      description: "Embark on a thrilling adventure with Captain Bartley and his eclectic crew.",
      image: voyagesImage2,
      link: "https://voyagesofvictora.com/",
      cta: "Read More"
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 5000); // Change ad every 5 seconds

    return () => clearInterval(interval);
  }, [ads.length]);

  const handleAdClick = (link) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const goToAd = (index) => {
    setCurrentAd(index);
  };

  return (
    <div className="ad-container">
      <div className="ad-header">
        <h3>Sponsored</h3>
        <div className="ad-indicators">
          {ads.map((_, index) => (
            <button
              key={index}
              className={`indicator ${currentAd === index ? 'active' : ''}`}
              onClick={() => goToAd(index)}
            />
          ))}
        </div>
      </div>

      <div className="ad-content">
        <div 
          className="ad-image"
          onClick={() => handleAdClick(ads[currentAd].link)}
        >
          <img 
            src={ads[currentAd].image} 
            alt={ads[currentAd].title}
            loading="lazy"
          />
          <div className="ad-overlay">
            <button className="ad-cta">
              {ads[currentAd].cta}
            </button>
          </div>
        </div>

        <div className="ad-text">
          <h4 className="ad-title">{ads[currentAd].title}</h4>
          <p className="ad-description">{ads[currentAd].description}</p>
          <div className="ad-footer">
            {/* <span className="ad-source">
              {ads[currentAd].link.includes('amazon') ? 'Amazon' : 'Voyages of Victoria'}
            </span> */}
            <button 
              className="ad-link-btn"
              onClick={() => handleAdClick(ads[currentAd].link)}
            >
              Visit Site →
            </button>
          </div>
        </div>
      </div>

      <div className="ad-controls">
        <button 
          className="control-btn prev"
          onClick={() => setCurrentAd((prev) => (prev - 1 + ads.length) % ads.length)}
        >
          ‹
        </button>
        <button 
          className="control-btn next"
          onClick={() => setCurrentAd((prev) => (prev + 1) % ads.length)}
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default AdComponent;