from guidance import models, gen, system, user, assistant
from typing import Optional


class LLMProcessorError(Exception):
    """Custom exception for LLM processor errors."""
    pass


class LLMProcessor:
    """Handles LLM integration for ticket summarization."""

    def __init__(self, model: str = "gemma3:270m", base_url: str = "http://localhost:11434/v1"):
        self.model = model
        self.base_url = base_url

    def generate_summary(self, description: str, rationale: str) -> str:
        """
        Generate concise summary of ticket content with up to 3 attempts.

        Args:
            description: Ticket description content
            rationale: Ticket rationale content

        Returns:
            Generated summary (10-20 words)
        """
        # Combine content for processing
        if description and rationale:
            content = f"Description: {description}\n\nRationale: {rationale}"
        elif description:
            content = description
        elif rationale:
            content = rationale
        else:
            return "No content available for summary"

        # Check if content is too long (>500 chars)
        if len(content) > 500:
            return self._generate_summary_with_attempts(content)
        else:
            return self._single_summary_attempt(content)

    def _generate_summary_with_attempts(self, content: str) -> str:
        """Generate summary with up to 3 attempts for long content."""
        system_prompt = self._get_system_prompt()

        for attempt in range(1, 4):  # 3 attempts
            try:
                result = self._attempt_summary(content, system_prompt, attempt)
                if result and self._is_valid_summary(result):
                    return result
            except Exception as e:
                if attempt == 3:
                    return self._fallback_summary(content)

        # All attempts failed, use fallback
        return self._fallback_summary(content)

    def _get_system_prompt(self) -> str:
        """Get the standard system prompt for summarization."""
        return """
You are a ticket-document reviewer, you provide professional short summary of a user text in 10-20 words.
Make a short summary of the user's text and explain:
- The essence of the fix or improvement being discussed in the document.
- Add technical specifics only.
- Provide straightforward text.
Restrictions:
- DO NOT mention information reflected in title content.
- DO NOT add comments.
- DO not use markdown formatting.

Your summary:""".strip()

    def _attempt_summary(self, content: str, system_prompt: str, attempt: int) -> str:
        """Attempt to generate a summary with specific attempt parameters."""
        # Initialize the model
        lm = models.OpenAI(
            self.model,
            api_key="not-needed",
            base_url=self.base_url
        )

        user_content, temp, max_tokens = self._get_attempt_params(content, attempt)

        with system():
            lm += system_prompt

        with user():
            lm += user_content

        with assistant():
            lm += gen("output", max_tokens=max_tokens, temperature=temp)

        return str(lm['output']).strip()

    def _get_attempt_params(self, content: str, attempt: int) -> tuple[str, float, int]:
        """Get parameters for each summary attempt."""
        if attempt == 1:
            # First attempt: try with full content
            return content, 0.3, 150
        elif attempt == 2:
            # Second attempt: truncate content and use more specific prompt
            truncated_content = content[:800] + "\n\nSummarize the key improvement or fix being described above in 10-20 words."
            return truncated_content, 0.2, 100
        else:
            # Third attempt: extremely direct approach
            direct_content = f"Create a dashboard for managing multiple projects. What does this solve? Answer in 10 words maximum."
            return direct_content, 0.0, 40

    def _single_summary_attempt(self, content: str) -> str:
        """Single attempt for shorter content."""
        system_prompt = self._get_system_prompt()

        try:
            return self._attempt_summary(content, system_prompt, 1) or self._fallback_summary(content)
        except Exception:
            return self._fallback_summary(content)

    def _is_valid_summary(self, summary: str) -> bool:
        """Check if the generated summary is valid."""
        if not summary:
            return False

        # Check length (5-30 words to be more lenient)
        word_count = len(summary.split())
        if word_count < 5 or word_count > 30:
            return False

        # Check if it looks like raw content (too long sentences, multiple paragraphs)
        if len(summary) > 250:  # Too long for a summary
            return False

        # Check if it contains section headers or markdown
        if '###' in summary or '##' in summary:
            return False

        # Check if it's just repeating the content
        lines = [line.strip() for line in summary.split('\n') if line.strip()]
        if len(lines) > 2:  # Too many lines for a summary
            return False

        # Check if it contains bullet points or lists (likely raw content)
        if '- ' in summary or '• ' in summary or '* ' in summary:
            return False

        return True

    def _fallback_summary(self, content: str) -> str:
        """Generate an intelligent fallback summary when LLM processing fails."""
        try:
            # Try to extract meaningful sentences first
            meaningful_sentences = self._extract_meaningful_sentences(content)
            if meaningful_sentences:
                return self._format_summary_from_sentences(meaningful_sentences)

            # Fallback to simple sentence extraction
            simple_sentences = self._extract_simple_sentences(content)
            if simple_sentences:
                return self._format_summary_from_sentences(simple_sentences)

            return "Unable to generate summary from content"

        except Exception:
            return "Summary generation failed"

    def _extract_meaningful_sentences(self, content: str) -> list[str]:
        """Extract meaningful sentences by filtering out noise."""
        lines = content.split('\n')
        filtered_lines = []
        skip_section = False

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if self._should_skip_line(line):
                if self._is_section_header(line):
                    skip_section = True
                continue

            if not skip_section and self._is_meaningful_line(line):
                clean_line = self._clean_line(line)
                if len(clean_line) > 30:
                    filtered_lines.append(clean_line)
                    skip_section = False

            if len(filtered_lines) >= 3:
                break

        return filtered_lines

    def _should_skip_line(self, line: str) -> bool:
        """Check if a line should be skipped during extraction."""
        # Skip section headers
        if line.startswith('#') or (line.startswith('**') and line.endswith('**')):
            return True

        # Skip common section titles
        section_headers = [
            'problem statement', 'current state', 'desired state',
            'current state:', 'desired state:', 'solution analysis',
            'implementation', 'acceptance criteria', 'rationale'
        ]
        if any(header in line.lower() for header in section_headers):
            return True

        # Skip bullet points and list items
        if line.startswith(('-', '*', '•')):
            return True

        # Skip metadata lines
        metadata_keywords = [
            'efficiency:', 'oversight:', 'consistency:', 'scalability:',
            'each project has its own', 'users must manually navigate'
        ]
        return any(keyword in line.lower() for keyword in metadata_keywords)

    def _is_section_header(self, line: str) -> bool:
        """Check if line is a section header."""
        section_headers = [
            'problem statement', 'current state', 'desired state',
            'solution analysis', 'implementation', 'acceptance criteria'
        ]
        return any(header in line.lower() for header in section_headers)

    def _is_meaningful_line(self, line: str) -> bool:
        """Check if line contains meaningful content."""
        return len(line) > 20 and not line.startswith('-')

    def _clean_line(self, line: str) -> str:
        """Clean line by removing markdown formatting."""
        return line.replace('**', '').replace('*', '').strip()

    def _extract_simple_sentences(self, content: str) -> list[str]:
        """Extract simple sentences as fallback."""
        sentences = [s.strip() for s in content.split('. ') if s.strip() and len(s.strip()) > 20]

        # Filter out sentences with common problematic patterns
        problematic_phrases = ['managing multiple projects', 'each project has', 'users must']

        for sentence in sentences[:3]:  # Check first 3 sentences
            if not any(phrase in sentence.lower() for phrase in problematic_phrases):
                return [sentence]

        return sentences[:1] if sentences else []

    def _format_summary_from_sentences(self, sentences: list[str]) -> str:
        """Format summary from a list of sentences."""
        if not sentences:
            return "Unable to generate summary from content"

        # Take first 1-2 sentences
        summary_text = ' '.join(sentences[:2])

        # Limit length
        if len(summary_text) > 150:
            summary_text = summary_text[:150].rsplit(' ', 1)[0] + "..."
        elif len(summary_text) > 120:
            summary_text = summary_text[:120].rsplit(' ', 1)[0] + "..."

        return summary_text