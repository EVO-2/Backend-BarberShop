const list = [
    './routes/auth.routes',
    './routes/rol.routes',
    './routes/usuario.routes',
    './routes/cliente.routes',
    './routes/peluquero.routes',
    './routes/cita.routes',
    './routes/sede.routes',
    './routes/puesto.routes',
    './routes/catalogo.routes',
    './routes/pago',
    './routes/servicio.routes',
    './routes/notification.routes',
    './routes/reportes.routes',
    './routes/equipo.routes'
];

async function check() {
    for (const file of list) {
        try {
            console.log(`Checking ${file}...`);
            require(file);
            console.log(`✅ ${file} loaded successfully`);
        } catch (e) {
            console.error(`❌ Error loading ${file}:`);
            console.error(e);
            // Don't exit, just continue to see if others fail (though usually one crash stops the process)
            // But here the error is likely synchronously thrown during require execution of router.get
            process.exit(1);
        }
    }
}

check();
