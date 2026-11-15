import { http, errorMessage } from './http';

/*
 * Login accounts. Online only (not queued offline): every change needs the current
 * password of the logged-in user, checked by the server at that moment.
 */

export interface UserAccount {
  id: number;
  username: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

const body = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const getUsers = () => body<UserAccount[]>(http.get('/users'));

export const createUser = (username: string, password: string, currentPassword: string) =>
  body<UserAccount>(http.post('/users', { username, password, current_password: currentPassword }));

export const updateUser = (
  id: number,
  changes: { username?: string; password?: string },
  currentPassword: string,
) => body<UserAccount>(http.put(`/users/${id}`, { ...changes, current_password: currentPassword }));

export const deleteUser = (id: number, currentPassword: string) =>
  body<null>(http.delete(`/users/${id}`, { data: { current_password: currentPassword } }));

export const changeMyPassword = (currentPassword: string, newPassword: string) =>
  body<null>(http.put('/auth/password', { current_password: currentPassword, new_password: newPassword }));

/** API messages are in English; show them in Portuguese. */
const MESSAGES: Array<[RegExp, string]> = [
  [/username already exists/i, 'Já existe um usuário com esse nome.'],
  [/username must have/i, 'O usuário deve ter de 3 a 50 caracteres (letras, números, ponto, hífen ou sublinhado).'],
  [/password must have at least/i, 'A senha deve ter pelo menos 10 caracteres.'],
  [/password must have at most/i, 'A senha é longa demais.'],
  [/cannot delete your own user/i, 'Você não pode excluir o seu próprio usuário.'],
  [/last user cannot be deleted/i, 'O último usuário não pode ser excluído.'],
  [/user not found/i, 'Usuário não encontrado. Atualize a lista.'],
];

export function userErrorMessage(err: unknown): string {
  const msg = errorMessage(err);
  return msg
    .split(', ')
    .map((part) => MESSAGES.find(([re]) => re.test(part))?.[1] ?? part)
    .join(' ');
}
