import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Camera, 
  Search, 
  Shield, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle,
  FileSearch
} from 'lucide-react';

const HeroSection = ({ onOpenReverseSearch, onOpenSighting, user }) => {
  return (
    <section aria-label="Introducción Institucional" style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '2rem',
      background: 'linear-gradient(135deg, #0d1527 0%, #0f1c3a 50%, #09101f 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      padding: '2.5rem 2rem'
    }}>
      {/* Subtle geometric grid background accent */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
        {/* Official Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            padding: '0.25rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 600
          }}>
            <Shield size={14} />
            <span>Sistema Nacional de Búsqueda y Apoyo a Familias • El Salvador</span>
          </span>
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontSize: 'clamp(1.85rem, 3.5vw, 2.75rem)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
          color: '#ffffff',
          marginBottom: '1rem'
        }}>
          Unidos en la Búsqueda y Localización de Personas
        </h1>

        {/* Narrative Description */}
        <p style={{
          fontSize: 'clamp(0.92rem, 1.5vw, 1.05rem)',
          color: '#94a3b8',
          lineHeight: 1.6,
          maxWidth: '700px',
          margin: '0 auto 2rem'
        }}>
          Plataforma de articulación nacional entre la ciudadanía, la Policía Nacional Civil y los cuerpos de rescate para la difusión ágil de alertas y la búsqueda solidaria de seres queridos en los 14 departamentos de la República.
        </p>

        {/* Primary Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.85rem',
          flexWrap: 'wrap',
          marginBottom: '2.5rem'
        }}>
          <Link
            to={user ? '/reportar' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.6rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              color: '#ffffff',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(225, 29, 72, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <AlertTriangle size={18} />
            <span>Reportar Desaparición</span>
          </Link>

          <button
            type="button"
            onClick={onOpenSighting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Camera size={18} />
            <span>Aportar Información / Pista</span>
          </button>

          <button
            type="button"
            onClick={onOpenReverseSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f1f5f9',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSearch size={18} />
            <span>Búsqueda por Foto</span>
          </button>
        </div>

        {/* 4 Pillars Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          textAlign: 'left'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1rem 1.15rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <MapPin size={18} color="#38bdf8" />
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                14 Departamentos
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Cobertura en puestos fronterizos y terminales de transporte.
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1rem 1.15rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Clock size={18} color="#10b981" />
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                Primeras Horas Clave
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Emisión ágil de avisos sin esperar lapsos de 24 o 48 horas.
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1rem 1.15rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Users size={18} color="#fbbf24" />
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                Red Solidaria
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Recepción anónima y segura de testimonios y pistas ciudadanas.
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1rem 1.15rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Shield size={18} color="#a855f7" />
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                Articulación Oficial
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Canal directo con la Policía Nacional Civil y Fiscalía General.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
