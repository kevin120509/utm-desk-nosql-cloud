// Logotipo de UTM Desk: el glifo real de la UTM (rombo de franjas) sobre tile blanco.
export default function Marca({ tamano = 36 }) {
  return (
    <img
      src="/logo-utm.png"
      width={tamano}
      height={tamano}
      alt=""
      aria-hidden="true"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className="shrink-0 select-none rounded-[22%]"
    />
  );
}
