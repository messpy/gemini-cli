/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  CountTokensResponse,
  EmbedContentParameters,
  Part,
  Content,
  FinishReason,
  ContentListUnion,
  ContentUnion,
  PartUnion,
} from '@google/genai';
import { Ollama, Message, ChatResponse } from 'ollama';
import { ContentGenerator } from '../core/contentGenerator.js';

export class OllamaServer implements ContentGenerator {
  private client: Ollama;

  constructor(
    readonly host?: string,
    readonly model: string = 'llama3.2',
  ) {
    this.client = new Ollama({ host: host || 'http://127.0.0.1:11434' });
  }

  private toContents(contents: ContentListUnion): Content[] {
    if (Array.isArray(contents)) {
      // it's a Content[] or a PartUnion[]
      return contents.map((c) => this.toContent(c));
    }
    // it's a Content or a PartUnion
    return [this.toContent(contents)];
  }

  private toContent(content: ContentUnion): Content {
    if (Array.isArray(content)) {
      // it's a PartUnion[]
      return {
        role: 'user',
        parts: this.toParts(content),
      };
    }
    if (typeof content === 'string') {
      return {
        role: 'user',
        parts: [{ text: content }],
      };
    }
    // it's a Part or Content
    if ('text' in content || 'inlineData' in content || 'functionCall' in content || 'functionResponse' in content || 'executableCode' in content || 'codeExecutionResult' in content || 'fileData' in content) {
      // it's a Part
      return {
        role: 'user',
        parts: [content as Part],
      };
    }
    // it's a Content
    return content as Content;
  }

  private toParts(parts: PartUnion | PartUnion[]): Part[] {
    if (Array.isArray(parts)) {
      return parts.map((p) => this.toPart(p));
    }
    return [this.toPart(parts)];
  }

  private toPart(part: PartUnion): Part {
    if (typeof part === 'string') {
      return { text: part };
    }
    return part;
  }

  private convertPartsToContent(parts: Part[]): string {
    return parts
      .map((part) => {
        if ('text' in part) {
          return part.text;
        }
        if ('inlineData' in part) {
          // For now, skip inline data (images, etc.)
          return '[Binary data omitted]';
        }
        if ('functionCall' in part) {
          return JSON.stringify(part.functionCall);
        }
        if ('functionResponse' in part) {
          return JSON.stringify(part.functionResponse);
        }
        return '';
      })
      .join('\n');
  }

  private convertContentsToMessages(contents: Content[]): Message[] {
    return contents.map((content) => ({
      role: (content.role === 'model' ? 'assistant' : content.role) as string,
      content: this.convertPartsToContent(content.parts || []),
    }));
  }

  private convertOllamaResponseToGenai(
    response: ChatResponse,
  ): GenerateContentResponse {
    const out = new GenerateContentResponse();
    out.candidates = [
      {
        index: 0,
        content: {
          role: 'model',
          parts: [{ text: response.message.content }],
        },
        finishReason: response.done ? FinishReason.STOP : undefined,
      },
    ];
    out.usageMetadata = response.eval_count
      ? {
          promptTokenCount: response.prompt_eval_count || 0,
          candidatesTokenCount: response.eval_count || 0,
          totalTokenCount:
            (response.prompt_eval_count || 0) + (response.eval_count || 0),
        }
      : undefined;
    return out;
  }

  async generateContentStream(
    req: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const contents = this.toContents(req.contents);
    const messages = this.convertContentsToMessages(contents);
    const systemInstruction = req.config?.systemInstruction;
    let systemMessage: Message | undefined;

    if (systemInstruction) {
      if (typeof systemInstruction === 'string') {
        systemMessage = { role: 'system', content: systemInstruction };
      } else if ('parts' in systemInstruction) {
        systemMessage = {
          role: 'system',
          content: this.convertPartsToContent(systemInstruction.parts || []),
        };
      }
    }

    const allMessages = systemMessage
      ? [systemMessage, ...messages]
      : messages;

    const stream = await this.client.chat({
      model: req.model || this.model,
      messages: allMessages,
      stream: true,
    });

    return (async function* (): AsyncGenerator<GenerateContentResponse> {
      for await (const chunk of stream) {
        const out = new GenerateContentResponse();
        out.candidates = [
          {
            index: 0,
            content: {
              role: 'model',
              parts: [{ text: chunk.message.content }],
            },
            finishReason: chunk.done ? FinishReason.STOP : undefined,
          },
        ];
        yield out;
      }
    })();
  }

  async generateContent(
    req: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const contents = this.toContents(req.contents);
    const messages = this.convertContentsToMessages(contents);
    const systemInstruction = req.config?.systemInstruction;
    let systemMessage: Message | undefined;

    if (systemInstruction) {
      if (typeof systemInstruction === 'string') {
        systemMessage = { role: 'system', content: systemInstruction };
      } else if ('parts' in systemInstruction) {
        systemMessage = {
          role: 'system',
          content: this.convertPartsToContent(systemInstruction.parts || []),
        };
      }
    }

    const allMessages = systemMessage
      ? [systemMessage, ...messages]
      : messages;

    const response = await this.client.chat({
      model: req.model || this.model,
      messages: allMessages,
      stream: false,
    });

    return this.convertOllamaResponseToGenai(response);
  }

  async countTokens(req: CountTokensParameters): Promise<CountTokensResponse> {
    const contents = this.toContents(req.contents);

    // Ollama doesn't have a direct token counting API
    // We'll approximate based on text length
    const text = contents
      .map((content) => this.convertPartsToContent(content.parts || []))
      .join('\n');

    // Rough approximation: 1 token ~= 4 characters
    const approximateTokens = Math.ceil(text.length / 4);

    return {
      totalTokens: approximateTokens,
    };
  }

  async embedContent(
    req: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const contents = this.toContents(req.contents);
    const embeddings = await Promise.all(
      contents.map(async (content: Content) => {
        const text = this.convertPartsToContent(content.parts || []);
        const response = await this.client.embeddings({
          model: req.model || this.model,
          prompt: text,
        });
        return {
          values: response.embedding,
        };
      }),
    );

    return {
      embeddings,
    };
  }
}
