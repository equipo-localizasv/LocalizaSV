-- Database schema for LocalizaSV

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    dui VARCHAR(10) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    selfie_url VARCHAR(512) NOT NULL,
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

CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    caso_id INT REFERENCES casos(id) ON DELETE CASCADE NOT NULL,
    ubicacion_lat DECIMAL(10, 8) NOT NULL,
    ubicacion_lng DECIMAL(11, 8) NOT NULL,
    porcentaje_confianza DECIMAL(5, 2) NOT NULL,
    video_url VARCHAR(512),
    foto_evidencia_url VARCHAR(512),
    estado VARCHAR(50) DEFAULT 'pendiente' NOT NULL,
    id_estado_alerta INT DEFAULT 1 NOT NULL,
    moderador_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_validacion TIMESTAMP,
    comentarios TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
