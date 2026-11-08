// TaskFlow - Utilidades del módulo académico (parciales, laboratorios, promedio)

export const calculateWeightedAverage = (items = []) => {
  const graded = items.filter(
    (i) => i && i.grade !== null && i.grade !== undefined && String(i.grade).trim() !== ''
  );
  const weighted = graded.filter(
    (i) => i.weight_percentage !== null && i.weight_percentage !== undefined && Number(i.weight_percentage) > 0
  );
  const weightTotal = weighted.reduce((sum, i) => sum + Number(i.weight_percentage || 0), 0);
  const gradedCount = graded.length;

  if (weightTotal <= 0) {
    return { average: null, weightTotal: 0, gradedCount };
  }

  const total = weighted.reduce((sum, i) => sum + Number(i.grade) * Number(i.weight_percentage), 0);
  const average = Math.round((total / weightTotal) * 100) / 100;
  return { average, weightTotal, gradedCount };
};

export const formatGrade = (grade) => {
  if (grade === null || grade === undefined || grade === '') return '—';
  const value = Number(grade);
  if (Number.isNaN(value)) return '—';
  return Number(value.toFixed(1));
};

export const formatWeight = (weight) => {
  if (weight === null || weight === undefined || weight === '') return null;
  const value = Number(weight);
  if (Number.isNaN(value)) return null;
  return value;
};

export const isItemRealizado = (item) => item?.status === 'realizado';
