import { browser } from 'wxt/browser';
import type {
  AccountState,
  Fail,
  Message,
  Response,
  Settings,
  SettingsOk,
  SimpleOk,
  StatusOk,
  TagAccountOk,
} from './types';

export async function send<T extends Response>(message: Message): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

export function tagAccount(payload: AccountState) {
  return send<TagAccountOk | Fail>({ type: 'TAG_ACCOUNT', payload });
}

export function getSettings() {
  return send<SettingsOk | Fail>({ type: 'GET_SETTINGS' });
}

export function setSettings(payload: Settings) {
  return send<SettingsOk | Fail>({ type: 'SET_SETTINGS', payload });
}

export function getStatus() {
  return send<StatusOk | Fail>({ type: 'GET_STATUS' });
}

export function clearCache() {
  return send<SimpleOk | Fail>({ type: 'CLEAR_CACHE' });
}
