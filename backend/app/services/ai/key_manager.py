"""Gestor seguro de claves API para proveedores de IA.

Almacena las claves API en un archivo local con permisos restrictivos,
NUNCA en SQLite en texto plano, NUNCA en variables de entorno expuestas.
"""

import json
import os
import stat
from pathlib import Path
from typing import Optional, Dict, List

# Directorio de configuración local del usuario
CONFIG_DIR = Path.home() / ".taskflow"
KEYS_FILE = CONFIG_DIR / "api_keys.json"

# Permisos restrictivos: solo el propietario puede leer/escribir
FILE_PERMISSIONS = stat.S_IRUSR | stat.S_IWUSR  # 0600


class KeyManager:
    """Gestiona el almacenamiento seguro de claves API de proveedores de IA.

    Las claves se almacenan en un archivo JSON local con permisos 0600,
    fuera de la base de datos SQLite, para evitar exponer secretos.
    """

    def __init__(self):
        self._ensure_config_dir()

    def _ensure_config_dir(self):
        """Crea el directorio de configuración si no existe."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        # Asegurar permisos restrictivos en el directorio
        try:
            os.chmod(CONFIG_DIR, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)  # 0700
        except OSError:
            pass

    def _load_keys(self) -> Dict[str, str]:
        """Carga todas las claves almacenadas."""
        if not KEYS_FILE.exists():
            return {}
        try:
            with open(KEYS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, OSError):
            return {}

    def _save_keys(self, keys: Dict[str, str]):
        """Guarda las claves con permisos restrictivos."""
        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(keys, f, indent=2)
        try:
            os.chmod(KEYS_FILE, FILE_PERMISSIONS)
        except OSError:
            pass

    def get_key(self, provider_name: str) -> Optional[str]:
        """Obtiene la clave API de un proveedor."""
        keys = self._load_keys()
        return keys.get(provider_name)

    def set_key(self, provider_name: str, api_key: str):
        """Guarda la clave API de un proveedor."""
        keys = self._load_keys()
        keys[provider_name] = api_key
        self._save_keys(keys)

    def delete_key(self, provider_name: str) -> bool:
        """Elimina la clave API de un proveedor. Retorna True si existía."""
        keys = self._load_keys()
        if provider_name in keys:
            del keys[provider_name]
            self._save_keys(keys)
            return True
        return False

    def list_providers(self) -> List[str]:
        """Lista los proveedores que tienen clave configurada."""
        return list(self._load_keys().keys())

    def clear_all(self):
        """Elimina todas las claves almacenadas."""
        if KEYS_FILE.exists():
            KEYS_FILE.unlink()


# Instancia singleton
key_manager = KeyManager()
