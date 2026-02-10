import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './ChromaGrid.css';

const ChromaGrid = ({
  items,
  className = '',
  radius = 300,
  columns = 3,
  rows = 2,
  damping = 0.45,
  fadeOut = 0.6,
  ease = 'power3.out'
}) => {
  const rootRef = useRef(null);
  const fadeRef = useRef(null);
  const setX = useRef(null);
  const setY = useRef(null);
  const pos = useRef({ x: 0, y: 0 });

  // Default demo data
  const demo = [
    { title: 'Demo 1', subtitle: 'Subtitle', image: 'https://via.placeholder.com/300' },
    { title: 'Demo 2', subtitle: 'Subtitle', image: 'https://via.placeholder.com/300' },
    { title: 'Demo 3', subtitle: 'Subtitle', image: 'https://via.placeholder.com/300' }
  ];
  const data = items?.length ? items : demo;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // 1. Setup Mouse Movement Tracking
    setX.current = gsap.quickSetter(el, '--x', 'px');
    setY.current = gsap.quickSetter(el, '--y', 'px');
    
    try {
        const { width, height } = el.getBoundingClientRect();
        pos.current = { x: width / 2, y: height / 2 };
        setX.current(pos.current.x);
        setY.current(pos.current.y);
    } catch (e) {
        console.log("GSAP Init skipped");
    }

    // 2. NEW: Staggered Entrance Animation
    // This finds all cards and animates them up one by one
    const cards = el.querySelectorAll('.chroma-card');
    gsap.fromTo(cards, 
      { 
        opacity: 0, 
        y: 50, // Start 50px lower
        scale: 0.95 
      }, 
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.8, 
        stagger: 0.1, // Wait 0.1s between each card
        ease: 'power3.out',
        clearProps: 'all' // Cleanup CSS after animation so hover works
      }
    );

  }, []);

  const moveTo = (x, y) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x);
        setY.current?.(pos.current.y);
      },
      overwrite: true
    });
  };

  const handleMove = e => {
    if (!rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    moveTo(e.clientX - r.left, e.clientY - r.top);
    gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
  };

  const handleLeave = () => {
    gsap.to(fadeRef.current, {
      opacity: 1,
      duration: fadeOut,
      overwrite: true
    });
  };

  const handleCardClick = url => {
    if (url) window.location.href = url;
  };

  const handleCardMove = e => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={rootRef}
      className={`chroma-grid ${className}`}
      style={{
        '--r': `${radius}px`,
        '--cols': columns,
        '--rows': rows
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {data.map((c, i) => (
        <article
          key={i}
          className="chroma-card"
          onMouseMove={handleCardMove}
          onClick={() => handleCardClick(c.url)}
          style={{
            '--card-border': c.borderColor || 'transparent',
            '--card-gradient': c.gradient,
            cursor: c.url ? 'pointer' : 'default'
          }}
        >
          <div className="chroma-img-wrapper">
            {c.image ? (
                <img src={c.image} alt={c.title} loading="lazy" />
            ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-4xl">🎓</div>
            )}
          </div>
          <footer className="chroma-info">
            <h3 className="name">{c.title}</h3>
            {c.handle && <span className="handle">{c.handle}</span>}
            <p className="role">{c.subtitle}</p>
          </footer>
        </article>
      ))}
      <div className="chroma-overlay" />
      <div ref={fadeRef} className="chroma-fade" />
    </div>
  );
};

export default ChromaGrid;