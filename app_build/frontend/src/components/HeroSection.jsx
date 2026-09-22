import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import soundEffects from '../services/soundEffects';

const HeroSection = ({ onOpenReverseSearch, user }) => {
  const canvasRef = useRef(null);

  // Malla interactiva de partículas cibernéticas en Canvas HTML5 ultraligero
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const numParticles = Math.min(45, Math.floor(width / 22));

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.2
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Dibujar partículas y conexiones
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Reacción leve al cursor
        const dxMouse = mouseX - p.x;
        const dyMouse = mouseY - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 120) {
          p.x -= (dxMouse / distMouse) * 1.5;
          p.y -= (dyMouse / distMouse) * 1.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fill();

        // Conectar con partículas cercanas
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.25 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      borderRadius: '20px',
      overflow: 'hidden',
      marginBottom: '2.5rem',
      background: 'linear-gradient(180deg, rgba(11, 19, 43, 0.85) 0%, rgba(3, 7, 18, 0.95) 100%)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 240, 255, 0.12)',
      padding: '3rem 2rem 2.5rem'
    }}>
      {/* Canvas interactivo de fondo */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          zIndex: 0
        }}
      />

      {/* Gradiente radial de viñeta */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 30%, rgba(3, 7, 18, 0.85) 100%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Contenido en primer plano */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '880px', margin: '0 auto' }}>
        {/* Badge superior */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{
            background: 'rgba(0, 240, 255, 0.12)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#38bdf8',
            padding: '0.3rem 0.85rem',
            borderRadius: '25px',
            fontSize: '0.78rem',
            fontFamily: 'monospace',
            fontWeight: 800,
            letterSpacing: '0.5px',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
          }}>
            ⚡ SISTEMA NACIONAL DE BÚSQUEDA FORENSE & VIDEOCUIDADANÍA
          </span>
        </div>

        {/* Título Principal */}
        <h1 style={{
          fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #00f0ff 45%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
        }}>
          Vigilancia Inteligente y Búsqueda Solidaria en El Salvador
        </h1>

        <p style={{
          fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
          color: '#cbd5e1',
          lineHeight: 1.6,
          maxWidth: '720px',
          margin: '0 auto 2rem'
        }}>
          Interconectamos la red nacional de cámaras de seguridad con el motor neuronal{' '}
          <strong style={{ color: '#00f0ff' }}>InsightFace ArcFace 512-D</strong> y la colaboración ciudadana para localizar personas desaparecidas en tiempo récord.
        </p>

        {/* Botones de Acción Rápida con Efecto Glow */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          <Link
            to={user ? '/reportar' : '/login'}
            onClick={() => soundEffects.playClickSound()}
            className="btn btn-primary"
            style={{
              padding: '0.85rem 1.8rem',
              fontSize: '1rem',
              fontWeight: 800,
              borderRadius: '30px',
              background: 'linear-gradient(135deg, #f43f5e 0%, #ef4444 100%)',
              color: '#fff',
              boxShadow: '0 0 25px rgba(244, 63, 94, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <span>🚨</span>
            <span>Reportar Desaparición Inmediata</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              soundEffects.playScanSound();
              if (onOpenReverseSearch) onOpenReverseSearch();
            }}
            className="btn btn-secondary"
            style={{
              padding: '0.85rem 1.8rem',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '30px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.45)',
              color: '#00f0ff',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
            }}
          >
            <span>🔬</span>
            <span>Búsqueda Facial Inversa (IA)</span>
          </button>
        </div>

        {/* 4 Métricas Clave de Impacto */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#00f0ff', fontFamily: 'monospace' }}>
              14/14
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.2rem' }}>
              Departamentos SV
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0, 255, 157, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#00ff9d', fontFamily: 'monospace' }}>
              ~15ms
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.2rem' }}>
              Inferencia Neuronal
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c084fc', fontFamily: 'monospace' }}>
              512-D
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.2rem' }}>
              Vectores ArcFace
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>
              24/7
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.2rem' }}>
              Vigilancia Autónoma
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
