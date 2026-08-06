export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const clean1 = str1.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const clean2 = str2.toLowerCase().replace(/[^\w\s]/g, '').trim();

  if (clean1 === clean2) return 1.0;
  if (!clean1 || !clean2) return 0;

  // 1. Token-based Jaccard similarity
  const tokens1 = new Set(clean1.split(/\s+/));
  const tokens2 = new Set(clean2.split(/\s+/));

  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersection++;
    }
  }
  const union = tokens1.size + tokens2.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  // 2. Normalized Levenshtein similarity
  const maxLen = Math.max(clean1.length, clean2.length);
  const levDist = levenshteinDistance(clean1, clean2);
  const levSim = maxLen > 0 ? 1 - levDist / maxLen : 0;

  // Weighted combination
  return Math.max(jaccard, levSim * 0.6 + jaccard * 0.4);
}
