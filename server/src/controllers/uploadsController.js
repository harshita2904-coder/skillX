export const uploadMedia = async (req, res) => {
  // Cloudinary integration placeholder. Requires CLOUDINARY_URL in env.
  if (!process.env.CLOUDINARY_URL) {
    return res.status(200).json({ note: 'Set CLOUDINARY_URL to enable uploads' });
  }
  // In a real implementation, parse file and upload to Cloudinary here.
  res.json({ ok: true });
};
