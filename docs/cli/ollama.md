# Ollama Integration

The Gemini CLI now supports [Ollama](https://ollama.ai/), allowing you to use local or cloud-based Ollama models for your AI workflows.

## What is Ollama?

Ollama is a tool that enables you to run large language models locally on your machine. It supports various open-source models like Llama, Mistral, CodeLlama, and many others. With Ollama integration in Gemini CLI, you can:

- Run AI models completely offline on your local machine
- Use custom or fine-tuned models
- Connect to remote Ollama instances (cloud or self-hosted)
- Avoid API rate limits and costs associated with cloud services

## Prerequisites

### Local Ollama Setup

1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Pull a model you want to use:
   ```bash
   ollama pull llama3.2
   ```
3. Verify Ollama is running:
   ```bash
   ollama list
   ```

### Cloud/Remote Ollama Setup

If you're connecting to a remote Ollama instance:
1. Ensure you have network access to the remote Ollama server
2. Know the URL of the remote Ollama API endpoint (e.g., `http://your-server:11434`)

## Configuration

### Environment Variables

You can configure Ollama integration using environment variables:

#### OLLAMA_HOST

Specifies the Ollama server URL. Defaults to `http://127.0.0.1:11434` (local).

**Local Ollama:**
```bash
# Uses default local Ollama instance
# No need to set OLLAMA_HOST for local usage
```

**Remote/Cloud Ollama:**
```bash
export OLLAMA_HOST="http://your-ollama-server:11434"
```

**Ollama Cloud:**
```bash
export OLLAMA_HOST="https://your-ollama-cloud-instance.com"
```

#### OLLAMA_MODEL

Specifies which model to use. Defaults to `llama3.2`.

```bash
export OLLAMA_MODEL="llama3.2"
# or use other models
export OLLAMA_MODEL="mistral"
export OLLAMA_MODEL="codellama"
export OLLAMA_MODEL="gemma"
```

### Using .env File

For persistent configuration, add these variables to your `.env` file:

```bash
# Local Ollama (default)
OLLAMA_MODEL=llama3.2

# Or for remote Ollama
OLLAMA_HOST=http://your-server:11434
OLLAMA_MODEL=mistral
```

## Usage

### Starting Gemini CLI with Ollama

1. Start Gemini CLI:
   ```bash
   gemini
   ```

2. When prompted to select an authentication method, choose **"Ollama"**

3. Start chatting with your Ollama model!

### Quick Start Example

```bash
# Make sure Ollama is running
ollama serve

# In another terminal, start Gemini CLI
gemini

# Select "Ollama" from the auth dialog
# Now you can start working with your local LLM!
```

### Example Workflow

Once connected to Ollama:

```text
> Analyze the code in this directory and suggest improvements

> Write a Python script to process CSV files

> Explain how this authentication system works
```

## Available Models

Ollama supports many models. Here are some popular ones:

- **llama3.2** - Latest Llama model (default)
- **llama3.1** - Previous Llama version
- **mistral** - Mistral AI's model
- **codellama** - Code-specialized Llama
- **phi** - Microsoft's lightweight model
- **gemma** - Google's Gemma model
- **neural-chat** - Intel's chat model
- **starling-lm** - Berkeley's chat model

To see all available models:
```bash
ollama list
```

To pull a new model:
```bash
ollama pull <model-name>
```

## Switching Between Providers

You can easily switch between different authentication methods:

1. Press `Ctrl+D` or use the `/auth` command to return to the auth dialog
2. Select a different authentication method (Google, Gemini API Key, Vertex AI, or Ollama)
3. Continue your work with the new provider

## Performance Considerations

### Local Ollama

- **Pros:**
  - Complete privacy - no data leaves your machine
  - No API costs or rate limits
  - Works offline
  - Low latency once model is loaded

- **Cons:**
  - Requires significant local compute resources
  - Initial model download can be large (2-8GB typically)
  - Slower than cloud APIs on less powerful hardware

### Remote/Cloud Ollama

- **Pros:**
  - No local compute requirements
  - Access to more powerful hardware
  - Shared infrastructure

- **Cons:**
  - Requires network connectivity
  - May have latency depending on connection
  - Less private than local deployment

## Troubleshooting

### Connection Errors

**Error: "Cannot connect to Ollama"**

- Verify Ollama is running: `ollama list`
- Check the OLLAMA_HOST environment variable
- Ensure firewall allows connections on port 11434

**Error: "Model not found"**

- List available models: `ollama list`
- Pull the model: `ollama pull llama3.2`
- Verify OLLAMA_MODEL matches an installed model

### Performance Issues

**Slow responses:**

- Check your hardware capabilities
- Try a smaller model (e.g., `phi` instead of `llama3.2`)
- Close other resource-intensive applications
- Consider using a remote Ollama instance with better hardware

### Memory Issues

**Out of memory errors:**

- Use a smaller model
- Increase available RAM or swap space
- Reduce context window size
- Close unnecessary applications

## Comparison with Other Auth Methods

| Feature | Ollama (Local) | Ollama (Cloud) | Gemini API | Vertex AI |
|---------|---------------|----------------|------------|-----------|
| **Privacy** | ✅ Fully private | ⚠️ Depends on host | ❌ Data sent to Google | ⚠️ Enterprise privacy |
| **Cost** | ✅ Free after hardware | 💰 Varies | 💰 Pay per use | 💰 Enterprise pricing |
| **Offline** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Setup** | ⚠️ Requires installation | ✅ Easy | ✅ Easy | ⚠️ Complex |
| **Performance** | ⚠️ Hardware dependent | ✅ Good | ✅ Excellent | ✅ Excellent |
| **Models** | 🔧 Open source | 🔧 Open source | 🏢 Google models | 🏢 Google models |

## Advanced Configuration

### Custom Model Parameters

While the CLI uses default model parameters, you can create custom Ollama configurations through the Ollama Modelfile system. See [Ollama documentation](https://github.com/ollama/ollama/blob/main/docs/modelfile.md) for details.

### Multiple Ollama Instances

You can switch between different Ollama instances by changing the `OLLAMA_HOST` environment variable:

```bash
# Use local Ollama
export OLLAMA_HOST="http://127.0.0.1:11434"
gemini

# In another session, use remote Ollama
export OLLAMA_HOST="http://remote-server:11434"
gemini
```

## Security Considerations

### Local Ollama

- All data stays on your machine
- No external API calls
- Safe for sensitive code and data

### Remote Ollama

- Data is sent over the network to the remote server
- Use HTTPS for encrypted connections
- Ensure you trust the remote server operator
- Consider using VPN for additional security

## Getting Help

If you encounter issues with Ollama integration:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Verify your Ollama installation: `ollama --version`
3. Review Ollama logs: check Ollama server output
4. Open an issue on the [Gemini CLI GitHub repository](https://github.com/google-gemini/gemini-cli/issues)

## Resources

- [Ollama Official Website](https://ollama.ai/)
- [Ollama GitHub Repository](https://github.com/ollama/ollama)
- [Ollama Model Library](https://ollama.ai/library)
- [Gemini CLI Documentation](../index.md)
