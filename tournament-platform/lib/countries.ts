export const COUNTRY_OPTIONS = [
  {
    code: "FR",
    label: "France",
    flagUrl: "https://img.icons8.com/?size=100&id=15497&format=png&color=000000",
  },
  {
    code: "TG",
    label: "Togo",
    flagUrl: "https://img.icons8.com/?size=100&id=iaep8gymdwVp&format=png&color=000000",
  },
  {
    code: "GH",
    label: "Ghana",
    flagUrl: "https://img.icons8.com/?size=100&id=miuwSDC4iBWJ&format=png&color=000000",
  },
  {
    code: "CM",
    label: "Cameroon",
    flagUrl: "https://img.icons8.com/?size=100&id=b6s4tU1sF3zC&format=png&color=000000",
  },
  {
    code: "BJ",
    label: "Benin",
    flagUrl: "https://img.icons8.com/?size=100&id=SUXVXWPCfQeF&format=png&color=000000",
  },
  {
    code: "CI",
    label: "Cote d'Ivoire",
    flagUrl: "https://img.icons8.com/?size=100&id=vNtn6h19uGRv&format=png&color=000000",
  },
  {
    code: "SN",
    label: "Senegale",
    flagUrl: "https://img.icons8.com/?size=100&id=QpU3DlDnMdlj&format=png&color=000000",
  },
  {
    code: "NE",
    label: "Niger",
    flagUrl: "https://img.icons8.com/?size=100&id=ZW6uYioMmJdp&format=png&color=000000",
  },
  {
    code: "NG",
    label: "Nigeria",
    flagUrl: "https://img.icons8.com/?size=100&id=Qbb2whnonplQ&format=png&color=000000",
  },
  {
    code: "ML",
    label: "Mali",
    flagUrl: "https://img.icons8.com/?size=100&id=EzM7O4uKa1pa&format=png&color=000000",
  },
  {
    code: "CA",
    label: "Canada",
    flagUrl: "https://img.icons8.com/?size=100&id=Dum84gAXfBP6&format=png&color=000000",
  },
] as const;

export type CountryCode = (typeof COUNTRY_OPTIONS)[number]["code"];

export function getCountryOption(code?: string | null) {
  if (!code) return null;
  return COUNTRY_OPTIONS.find((country) => country.code === code.toUpperCase()) ?? null;
}