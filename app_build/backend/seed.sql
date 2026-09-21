-- Datos de prueba para LocalizaSV

-- 1. Insertar Usuarios de Prueba
INSERT INTO usuarios (nombre, dui, email, telefono, password_hash, selfie_url, rol) VALUES
('Anderson Steven Alfaro', '12345678-9', 'anderson@localizasv.com', '7568-7438', '$2a$10$QPpqmIPe0Qk8fizsFKign.RlDKttD2cniUz5XnsqXbDdb9LDSttxa', '/uploads/selfie-1786375431004-843334194.jpg', 'autoridad'),
('Jose Daniel Mejia', '00251536-9', 'daniel.mejia@localizasv.com', '6961-7897', '$2a$10$D3y7Gp9LeLNaIJxxl0WcVeqHZQB/9vJjr/iH.y5sle4oGJR.NfvOi', '/uploads/selfie-1784267763279-96526501.jpeg', 'ciudadano'),
('Valeria Martinez Moderadora', '99999999-9', 'valeria.mod@localizasv.com', '7999-9999', '$2a$10$.vcoxQ5Ft6amPBa5AESs9uDLbJpBqUn8aUi97GdVnWaOog.Yd4qQm', '/uploads/selfie-1784861285906-554537158.jpg', 'moderador')
ON CONFLICT (dui) DO NOTHING;

-- 2. Insertar Casos de Prueba
INSERT INTO casos (usuario_id, nombre_desaparecido, edad, genero, fecha_desaparicion, ubicacion_desaparicion, descripcion, telefono_contacto, estado, foto_url) VALUES
(
    (SELECT id FROM usuarios WHERE email = 'daniel.mejia@localizasv.com' LIMIT 1),
    'Carlos Eduardo Hernandez',
    24,
    'Masculino',
    '2026-09-10',
    'Colonia Escalon, San Salvador',
    'Visto por ultima vez vistiendo camiseta negra y jeans azules cerca del redondel Masferrer.',
    '7568-7438',
    'Desaparecido',
    '/uploads/foto-1786376110135-737012434.jpg'
),
(
    (SELECT id FROM usuarios WHERE email = 'daniel.mejia@localizasv.com' LIMIT 1),
    'Sofia Alejandra Rivas',
    19,
    'Femenino',
    '2026-09-15',
    'Plaza Salvador del Mundo, San Salvador',
    'Estatura media, cabello castaño claro, llevaba mochila roja y chaqueta deportiva.',
    '6961-7897',
    'Desaparecido',
    '/uploads/foto-1786381545630-43547303.jpg'
);

-- 3. Insertar Cámaras de Videovigilancia
INSERT INTO camaras (nombre, ubicacion, lat, lng, ip_address, base_url, stream_url, snapshot_url, tipo, resolucion, fps, estado) VALUES
(
    'Cámara 01 - Plaza Salvador del Mundo',
    'Plaza Salvador del Mundo, San Salvador',
    13.7013,
    -89.2244,
    '192.168.1.100:8080',
    'http://192.168.1.100:8080',
    'http://192.168.1.100:8080/video',
    'http://192.168.1.100:8080/shot.jpg',
    'Cámara Móvil IP Webcam',
    '1080p FHD',
    30,
    'activa'
),
(
    'Cámara 02 - Redondel Masferrer',
    'Colonia Escalón, San Salvador',
    13.7092,
    -89.2458,
    '192.168.1.101:8080',
    'http://192.168.1.101:8080',
    'http://192.168.1.101:8080/video',
    'http://192.168.1.101:8080/shot.jpg',
    'Cámara Móvil IP Webcam',
    '1080p FHD',
    30,
    'activa'
);

-- 4. Insertar Alertas de Reconocimiento / Detección IA
INSERT INTO alertas (caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, foto_evidencia_url, estado, id_estado_alerta, tipo_origen, ubicacion_nombre, comentarios) VALUES
(
    (SELECT id FROM casos WHERE nombre_desaparecido = 'Carlos Eduardo Hernandez' LIMIT 1),
    13.7015,
    -89.2241,
    89.75,
    '/uploads/evidencia-ia-caso3-cam1-1789760559798.jpg',
    'pendiente',
    1,
    'Sistema Autónomo IA (InsightFace)',
    'Plaza Salvador del Mundo',
    'Coincidencia facial automática detectada por Cámara 01 con 89.75% de parentesco biométrico.'
);
