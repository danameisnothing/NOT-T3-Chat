"use client";

import { Button } from "@/components/ui/button";

interface SuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
  category: string;
}

// T720: changed suggestions to match latest
const suggestionsByCategory = {
  create: [
    "Write a short story about a robot discovering emotions",
    "Help me outline a sci-fi novel set in a post-apocalyptic world",
    "Create a character profile for a complex villain with sympathetic motives",
    "Give me 5 creative writing prompts for flash fiction",
  ],
  explore: [
    "Good books for fans of Rick Rubin",
    "Countries ranked by number of corgis",
    "Most successful companies in the world",
    "How much does Claude cost?",
  ],
  code: [
    "Write code to invert a binary search tree in Python",
    "What's the difference between Promise.all and Promise.allSettled?",
    "Explain React's useEffect cleanup function",
    "Best practices for error handling in async/await",
  ],
  learn: [
    "Beginner's guide to TypeScript",
    "Explain the CAP theorem in distributed systems",
    "Why is AI so expensive?",
    "Are black holes real?",
  ],
};

export function Suggestions({ onSelectSuggestion, category }: SuggestionsProps) {
  const suggestions = suggestionsByCategory[category as keyof typeof suggestionsByCategory] || suggestionsByCategory.create;

  return (
    <div className="flex flex-col text-foreground">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          // T720: changed border-secondary
          className="flex items-start gap-2 border-t border-[var(--secondary)]/40 py-1 first:border-none"
        >
          <Button
            variant="ghost"
            className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-sidebar-accent/50 sm:px-3 justify-start"
            onClick={() => onSelectSuggestion(suggestion)}
          >
            {/* T720: added text color thing */}
            <span className="text-[var(--secondary-foreground)]">{suggestion}</span>
          </Button>
        </div>
      ))}
    </div>
  );
} 