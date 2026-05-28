const run = async () => {
  // Letras base con dudas de la captura:
  // pub_test_UKQ [0 u O] sD8 [o u 0] VQIVYf [W u w] jQaKxGQDq [L u l] [1 u l u I] fCYsPn
  
  const part1 = "pub_test_UKQ";
  const options1 = ["0", "O"];
  const part2 = "sD8";
  const options2 = ["o", "0"];
  const part3 = "VQIVYf";
  const options3 = ["W", "w"];
  const part4 = "jQaKxGQDq";
  const options4 = ["L", "l"];
  const options5 = ["1", "l", "I"];
  const part5 = "fCYsPn";

  const combinations = [];

  for (const o1 of options1) {
    for (const o2 of options2) {
      for (const o3 of options3) {
        for (const o4 of options4) {
          for (const o5 of options5) {
            const key = `${part1}${o1}${part2}${o2}${part3}${o3}${part4}${o4}${o5}${part5}`;
            combinations.push(key);
          }
        }
      }
    }
  }

  console.log(`🔎 Probando ${combinations.length} combinaciones posibles contra Wompi...`);

  // Ejecutar peticiones en paralelo
  const batchSize = 10;
  for (let i = 0; i < combinations.length; i += batchSize) {
    const batch = combinations.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (key) => {
      try {
        const res = await fetch(`https://sandbox.wompi.co/v1/merchants/${key}`);
        const data = await res.json();
        
        if (res.status === 200 && !data.error) {
          console.log(`🎉 ¡LLAVE ENCONTRADA EN WOMPI!: ${key}`);
          console.log('Comercio:', data.data?.name || data.data);
          process.exit(0);
        }
      } catch (err) {
        // Ignorar errores de red
      }
    }));
  }

  console.log('❌ Ninguna combinación coincidió con un comercio activo en Wompi.');
};

run();
