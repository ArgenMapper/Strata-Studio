"""Amigos: simulación local explícita y RPC Supabase autenticada, sin claves privadas."""
import json
import secrets
import threading
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from . import storage


class SocialService:
    def __init__(self, provider):
        self.provider = provider
        self.lock = threading.RLock()

    def call(self, action, body):
        if action == 'cloud':
            return self.cloud(body)
        if action not in ('snapshot', 'add', 'remove', 'duo', 'nudge', 'edit'):
            raise ValueError('Operación social no válida.')
        with self.lock:
            path = storage.BASE_DIR / 'social_local.json'
            data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {
                'code': 'STRATA-' + secrets.token_hex(4).upper(), 'friends': [], 'notifications': []}
            friends = data['friends']
            for friend in friends:
                friend['active'] = friend.get('active_day') == datetime.now().date().isoformat()
            if action == 'add':
                import re
                code = str(body.get('code', '')).strip().upper()
                if not re.fullmatch(r'STRATA-[A-Z0-9]{8}', code) or code == data['code']:
                    raise ValueError('Usa un código STRATA-XXXXXXXX distinto del tuyo.')
                if not any(f['code'] == code for f in friends):
                    friends.append({'code': code, 'name': str(body.get('name') or code)[:80], 'tier': 'regular', 'xp': 0, 'active': False, 'duo': False, 'duo_days': 0, 'avatar': ''})
            elif action in ('remove', 'duo', 'nudge', 'edit'):
                friend = next((f for f in friends if f['code'] == body.get('code')), None)
                if not friend:
                    raise ValueError('El contacto ya no está disponible.')
                if action == 'remove':
                    friends.remove(friend)
                elif action == 'duo':
                    friend['duo'] = not friend.get('duo', False)
                elif action == 'nudge':
                    data['notifications'].append({'code': friend['code'], 'time': datetime.now(timezone.utc).isoformat(), 'kind': 'toque local'})
                    data['notifications'] = data['notifications'][-50:]
                elif action == 'edit':
                    friend.update(name=str(body.get('name', friend['name']))[:80], tier=body.get('tier') if body.get('tier') in ('casual', 'regular', 'serio', 'obsesivo') else 'regular', xp=max(0, min(20000, int(body.get('xp', 0)))), active=bool(body.get('active')))
                    friend['active_day'] = datetime.now().date().isoformat() if friend['active'] else ''
            if body.get('today_active'):
                today = datetime.now().date().isoformat()
                for friend in friends:
                    if friend.get('duo') and friend.get('active') and friend.get('duo_last') != today:
                        from datetime import date, timedelta
                        yesterday = (date.today() - timedelta(days=1)).isoformat()
                        friend['duo_days'] = friend.get('duo_days', 0) + 1 if friend.get('duo_last') == yesterday else 1
                        friend['duo_last'] = today
            storage._atomic_write_json(path, data)
            return {'ok': True, 'mode': 'local', **data}

    def cloud(self, body):
        session = getattr(self.provider, 'authenticated_session', None)
        if not session:
            raise ValueError('Inicia sesión con Supabase para conectar amigos en línea.')
        user, token = session()
        root = self.provider.url.removesuffix('/auth/v1') + '/rest/v1/rpc/'
        operation = body.get('operation', 'snapshot')
        if operation not in ('snapshot', 'add', 'accept', 'remove', 'duo', 'nudge', 'publish'):
            raise ValueError('Operación social no válida.')
        payload = {'operation': operation, 'friend_code': str(body.get('code', ''))[:32], 'details': body.get('details') or {}}
        request = Request(root + 'strata_social', data=json.dumps(payload).encode(), headers={
            'apikey': self.provider.key, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, method='POST')
        try:
            with urlopen(request, timeout=12) as response:
                result = json.loads(response.read(2 * 1024 * 1024))
            return {'ok': True, 'mode': 'cloud', **result}
        except HTTPError as exc:
            if exc.code in (404, 400):
                raise ValueError('La función social no está disponible. Aplica supabase_v11.sql en el proyecto Supabase y vuelve a sincronizar.') from None
            raise ValueError('Supabase rechazó la operación social. Comprueba la sesión y los permisos.') from None
        except (URLError, TimeoutError):
            raise ValueError('No se pudo sincronizar. Los contactos locales se conservan.') from None
