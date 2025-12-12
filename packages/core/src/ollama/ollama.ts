/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContentGenerator } from '../core/contentGenerator.js';
import { OllamaServer } from './ollamaServer.js';

export async function createOllamaContentGenerator(
  host?: string,
  model?: string,
): Promise<ContentGenerator> {
  return new OllamaServer(host, model);
}
