/**
 * Kompresi Gambar di Sisi Klien Peramban (TDD v2.0 Sec 1 & Sec 5)
 * Mengompresi foto resolusi tinggi kamera HP (3-8 MB) menjadi <= 500 KB
 */

export async function compressImage(file, maxSizeKB = 500) {
  // Jika bukan gambar (misal PDF), lewati kompresi
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Jika ukuran sudah kecil (di bawah 400 KB), langsung kembalikan
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Skala resolusi maksimum 1600px
        const maxDimension = 1600;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Kompresi kualitas JPEG adaptif
        let quality = 0.8;
        const targetBytes = maxSizeKB * 1024;

        function attemptBlob(q) {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }

              if (blob.size <= targetBytes || q <= 0.3) {
                // Konversi kembali ke File object dengan nama yang sama
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                console.log(`[Kompresi] Ukuran berkas dikurangi dari ${(file.size / 1024).toFixed(1)} KB menjadi ${(compressedFile.size / 1024).toFixed(1)} KB`);
                resolve(compressedFile);
              } else {
                attemptBlob(Math.max(0.2, q - 0.2));
              }
            },
            'image/jpeg',
            q
          );
        }

        attemptBlob(quality);
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}

