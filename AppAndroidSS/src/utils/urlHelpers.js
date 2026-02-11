export const resolveFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  return `https://skillsphere-production-86a9.up.railway.app${filePath}`;
};
