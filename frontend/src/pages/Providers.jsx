import ProviderConfig from '../components/ai/ProviderConfig';

/**
 * Página de proveedores de IA.
 *
 * Mel funciona con el proveedor activo. Aquí se pueden guardar varias
 * claves (OpenRouter, OpenAI, Gemini, Anthropic), probar su conexión y
 * cambiar de proveedor cuando uno agota su cuota o límite.
 */
const Providers = () => {
  return (
    <div className="fade-in">
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Proveedores IA</h1>
        <p className="text-muted-tf mb-0">
          Administra las claves de Mel y elige con qué proveedor responde.
        </p>
      </header>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-4">
              <ProviderConfig />
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card border-secondary shadow-sm">
            <div className="card-header bg-transparent border-secondary">
              <h6 className="fw-semibold mb-0">Cómo funciona</h6>
            </div>
            <div className="card-body p-3">
              <ul className="provider-help-list">
                <li>
                  El proveedor <strong>activo</strong> es el que usa Mel en cada
                  conversación.
                </li>
                <li>
                  Puedes guardar varias claves y cambiar de proveedor con un clic,
                  sin volver a escribir la API key.
                </li>
                <li>
                  Si un proveedor agota su cuota o alcanza su límite de
                  solicitudes, activa otro y continúa la conversación.
                </li>
                <li>
                  Sin proveedor configurado, el resto de TaskFlow sigue
                  funcionando con tus datos locales.
                </li>
                <li>
                  Las claves se guardan de forma local y nunca se muestran
                  completas en la interfaz.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Providers;
