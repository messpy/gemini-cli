/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaServer } from './ollamaServer.js';
import { FinishReason } from '@google/genai';

// Mock the ollama module
vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    embeddings: vi.fn(),
  })),
}));

describe('OllamaServer', () => {
  let server: OllamaServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new OllamaServer('http://localhost:11434', 'llama3.2');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default host and model', () => {
      const defaultServer = new OllamaServer();
      expect(defaultServer).toBeDefined();
      expect(defaultServer.host).toBeUndefined(); // Uses default internally
      expect(defaultServer.model).toBe('llama3.2');
    });

    it('should initialize with custom host and model', () => {
      const customServer = new OllamaServer('http://custom:8080', 'mistral');
      expect(customServer.host).toBe('http://custom:8080');
      expect(customServer.model).toBe('mistral');
    });
  });

  describe('generateContent', () => {
    it('should convert simple string content to Ollama format', async () => {
      const mockResponse = {
        message: { content: 'Hello, world!' },
        done: true,
        eval_count: 10,
        prompt_eval_count: 5,
      };

      // @ts-expect-error - accessing private client for mocking
      server.client.chat = vi.fn().mockResolvedValue(mockResponse);

      const result = await server.generateContent({
        model: 'llama3.2',
        contents: 'Hello',
      });

      expect(result.candidates).toBeDefined();
      expect(result.candidates![0].content.parts[0]).toEqual({
        text: 'Hello, world!',
      });
      expect(result.candidates![0].finishReason).toBe(FinishReason.STOP);
      expect(result.usageMetadata?.totalTokenCount).toBe(15);
    });

    it('should handle Content[] format', async () => {
      const mockResponse = {
        message: { content: 'Response' },
        done: true,
        eval_count: 5,
        prompt_eval_count: 3,
      };

      // @ts-expect-error - accessing private client for mocking
      server.client.chat = vi.fn().mockResolvedValue(mockResponse);

      const result = await server.generateContent({
        model: 'llama3.2',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Question' }],
          },
        ],
      });

      expect(result.candidates).toBeDefined();
      expect(result.candidates![0].content.parts[0].text).toBe('Response');
    });

    it('should include system instruction if provided', async () => {
      const mockResponse = {
        message: { content: 'Response' },
        done: true,
      };

      const chatSpy = vi.fn().mockResolvedValue(mockResponse);
      // @ts-expect-error - accessing private client for mocking
      server.client.chat = chatSpy;

      await server.generateContent({
        model: 'llama3.2',
        contents: 'Question',
        config: {
          systemInstruction: 'You are a helpful assistant',
        },
      });

      expect(chatSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'You are a helpful assistant',
            }),
          ]),
        }),
      );
    });
  });

  describe('generateContentStream', () => {
    it('should stream responses correctly', async () => {
      const mockStream = [
        { message: { content: 'Hello' }, done: false },
        { message: { content: ' world' }, done: false },
        { message: { content: '!' }, done: true },
      ];

      async function* mockStreamGenerator() {
        for (const chunk of mockStream) {
          yield chunk;
        }
      }

      // @ts-expect-error - accessing private client for mocking
      server.client.chat = vi.fn().mockResolvedValue(mockStreamGenerator());

      const streamResult =
        await server.generateContentStream({
          model: 'llama3.2',
          contents: 'Hello',
        });

      const chunks = [];
      for await (const chunk of streamResult) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(3);
      expect(chunks[0].candidates![0].content.parts[0].text).toBe('Hello');
      expect(chunks[2].candidates![0].finishReason).toBe(FinishReason.STOP);
    });
  });

  describe('countTokens', () => {
    it('should approximate token count based on character length', async () => {
      const result = await server.countTokens({
        model: 'llama3.2',
        contents: 'This is a test message',
      });

      // "This is a test message" is 22 characters, so ~6 tokens
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.totalTokens).toBeLessThan(50);
    });

    it('should handle Content[] format', async () => {
      const result = await server.countTokens({
        model: 'llama3.2',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Test' }],
          },
        ],
      });

      expect(result.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('embedContent', () => {
    it('should generate embeddings for content', async () => {
      const mockEmbedding = {
        embedding: [0.1, 0.2, 0.3, 0.4],
      };

      // @ts-expect-error - accessing private client for mocking
      server.client.embeddings = vi.fn().mockResolvedValue(mockEmbedding);

      const result = await server.embedContent({
        model: 'llama3.2',
        contents: ['test content'],
      });

      expect(result.embeddings).toBeDefined();
      expect(result.embeddings.length).toBe(1);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('should handle multiple content items', async () => {
      const mockEmbedding = {
        embedding: [0.1, 0.2],
      };

      // @ts-expect-error - accessing private client for mocking
      server.client.embeddings = vi.fn().mockResolvedValue(mockEmbedding);

      const result = await server.embedContent({
        model: 'llama3.2',
        contents: ['content 1', 'content 2'],
      });

      expect(result.embeddings.length).toBe(2);
    });
  });
});
