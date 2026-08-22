const KOLHAPUR_LOCALITIES = ['A', 'B'];
const initialData = { location: 'C' };
console.log(Boolean(initialData?.location && !KOLHAPUR_LOCALITIES.includes(initialData.location)));
