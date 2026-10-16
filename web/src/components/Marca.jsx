// Logotipo de UTM Desk: rombo (guiño al glifo de la UTM) en verde institucional y lima.
export default function Marca({ tamano = 36 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#0b5d42" />
      <path d="M16 5l9 9-9 9-9-9z" fill="#8bc34a" />
      <path d="M16 10.5l3.5 3.5-3.5 3.5-3.5-3.5z" fill="#ffffff" />
    </svg>
  );
}
