import multer from 'multer';

// Accept one image in the named multipart field. The file is kept in memory
// (never written to disk here) so its contents can be checked before saving.
export function imageUpload(fieldName, maxBytes) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 30, parts: 40 },
  }).single(fieldName);

  const maxMegabytes = Math.round(maxBytes / (1024 * 1024));

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) return next();

      const tooLarge = error.code === 'LIMIT_FILE_SIZE';

      return res.status(400).json({
        message: tooLarge
          ? `The image is too large. The maximum size is ${maxMegabytes} MB.`
          : 'Could not read the uploaded image.',
      });
    });
  };
}
