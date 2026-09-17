-- Database schema for LocalizaSV

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    dui VARCHAR(10) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    selfie_url VARCHAR(512) NOT NULL,
    rol VARCHAR(50) DEFAULT 'ciudadano' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS casos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
    nombre_desaparecido VARCHAR(255) NOT NULL,
    edad INT NOT NULL,
    genero VARCHAR(50) NOT NULL,
    fecha_desaparicion DATE NOT NULL,
    ubicacion_desaparicion VARCHAR(512) NOT NULL,
    descripcion TEXT NOT NULL,
    telefono_contacto VARCHAR(15) NOT NULL,
    estado VARCHAR(50) DEFAULT 'Desaparecido' NOT NULL,
    foto_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estados_alerta (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO estados_alerta (nombre) VALUES
('Pendiente'),
('Confirmado'),
('Falso Positivo')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    caso_id INT REFERENCES casos(id) ON DELETE CASCADE NOT NULL,
    ubicacion_lat DECIMAL(10, 8) NOT NULL,
    ubicacion_lng DECIMAL(11, 8) NOT NULL,
    porcentaje_confianza DECIMAL(5, 2) NOT NULL,
    video_url VARCHAR(512),
    foto_evidencia_url VARCHAR(512),
    estado VARCHAR(50) DEFAULT 'pendiente' NOT NULL,
    id_estado_alerta INT REFERENCES estados_alerta(id) DEFAULT 1 NOT NULL,
    moderador_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_validacion TIMESTAMP,
    comentarios TEXT,
    fecha_deteccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar las consultas de alertas
CREATE INDEX IF NOT EXISTS idx_alertas_caso_id ON alertas(caso_id);
CREATE INDEX IF NOT EXISTS idx_alertas_id_estado_alerta ON alertas(id_estado_alerta);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha_deteccion ON alertas(fecha_deteccion DESC);

-- Tabla para almacenar tokens de dispositivos móviles para notificaciones push
CREATE TABLE IF NOT EXISTS tokens_fcm (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
