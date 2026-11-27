# Armador de PDF

Herramienta web para preparar la documentación de cada socio antes de mandarla a firmar.

- Trabaja directo sobre una carpeta con **una subcarpeta por DNI** (Chrome o Edge).
- Muestra todos los PDFs e imágenes (JPG, PNG, JFIF) del socio como páginas: se pueden ordenar, rotar, excluir o quitar.
- Guarda el PDF final, ya renombrado (por defecto `{dni} gino.pdf`), en una **carpeta de listos**.
- Estado de cada socio: pendiente, no apto o listo.
- Photopea integrado para corregir las páginas que no están aptas. La versión editada reemplaza a la página y se guarda una copia en la carpeta del socio.

Todo se procesa en el navegador: los documentos no se suben a ningún servidor. Los archivos originales nunca se modifican.

## Contraseña (opcional)

En ⚙ Configuración → 🔒 Contraseña. Cifra con AES-GCM 256 todo lo que el Armador guarda en el navegador y las copias de seguridad. La clave sale de la contraseña con PBKDF2-SHA256 (600.000 vueltas); la contraseña no se guarda. Al activarla se muestra una vez un código de recuperación: con él se elige una contraseña nueva si te olvidás la tuya. No hay opción de borrar los datos. No cifra los PDF ni las carpetas del disco.

## Licencia

© 2026 Franco Baer. Todos los derechos reservados. Ver `LICENSE`.
