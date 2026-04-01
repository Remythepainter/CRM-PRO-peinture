import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

const rules = [
  { label: "Au moins 8 caractères", test: (p: string) => p.length >= 8 },
  { label: "Une lettre majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Une lettre minuscule", test: (p: string) => /[a-z]/.test(p) },
  { label: "Un chiffre", test: (p: string) => /\d/.test(p) },
  { label: "Un caractère spécial (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordStrength(password: string) {
  const passed = rules.filter((r) => r.test(password)).length;
  return { passed, total: rules.length, isValid: passed >= 4 };
}

const strengthLabels = ["Très faible", "Faible", "Moyen", "Bon", "Fort", "Excellent"];
const strengthColors = [
  "bg-destructive",
  "bg-destructive",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-primary",
  "bg-green-500",
];

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const results = useMemo(
    () => rules.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const passed = results.filter((r) => r.passed).length;

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      {/* Strength bar */}
      <div className="flex gap-1">
        {Array.from({ length: rules.length }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < passed ? strengthColors[passed] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Force : {strengthLabels[passed]}
      </p>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {results.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5 text-xs">
            {r.passed ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className={r.passed ? "text-muted-foreground" : "text-muted-foreground/70"}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
