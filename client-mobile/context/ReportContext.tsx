import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { getReportsApiClient, CreateReportRequest } from "@/services/reportsApi";

export type CriticalityLevel = "kritik" | "yuksek" | "orta" | "dusuk";
export type ReportStatus = "beklemede" | "inceleniyor" | "cozuldu";

export interface Report {
  id: string;
  image: string;
  description: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
  status: ReportStatus;
  criticality: CriticalityLevel;
}

interface ReportContextType {
  reports: Report[];
  isLoading: boolean;
  error: string | null;
  addReport: (
    report: Omit<Report, "id" | "timestamp" | "status" | "criticality">,
  ) => Promise<boolean>;
  fetchReports: () => Promise<void>;
  clearError: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

function analyzeCriticality(
  description: string,
  category: string,
): CriticalityLevel {
  const text = description.toLowerCase();
  const criticalWords = [
    "patlak",
    "çökme",
    "yangın",
    "tehlike",
    "acil",
    "kopma",
    "göçük",
    "elektrik çarpması",
  ];
  const highWords = [
    "kırık",
    "delik",
    "su baskını",
    "tıkanık",
    "karanlık",
    "tehlikeli",
    "hasar",
  ];
  const mediumWords = [
    "çatlak",
    "bozuk",
    "sızıntı",
    "arızalı",
    "kötü",
    "yıpranmış",
  ];

  if (criticalWords.some((w) => text.includes(w))) return "kritik";
  if (highWords.some((w) => text.includes(w))) return "yuksek";
  if (mediumWords.some((w) => text.includes(w))) return "orta";
  if (category === "elektrik" || category === "gaz") return "yuksek";
  if (category === "su") return "orta";
  return "dusuk";
}

const SAMPLE_REPORTS: Report[] = [
  {
    id: "1",
    image:
      "https://www.manisadenge.com/images/haber/kirik-ve-dokuk-kaldirimlar-165833-20230609.jpg",
    description:
      "Kaldırımda ciddi kırılmalar var, yayalar tehlikeli şekilde yoldan yürümek zorunda kalıyor.",
    category: "yol",
    categoryLabel: "Yol / Kaldırım",
    latitude: 39.9255,
    longitude: 32.8662,
    address: "Kızılay, Atatürk Bulvarı, Ankara",
    timestamp: Date.now() - 3600000,
    status: "beklemede",
    criticality: "dusuk",
  },
  {
    id: "2",
    image:
      "https://static.birgun.net/resim/haber-detay-resim/2022/01/06/kanalizasyon-sorunu-halki-birlestirdi-964533-5.jpg",
    description:
      "Su borusu sızıntısı yapıyor, sokaklarda su birikintisi oluşmuş.",
    category: "su",
    categoryLabel: "Su / Kanalizasyon",
    latitude: 39.9412,
    longitude: 32.8543,
    address: "Çankaya, Tunalı Hilmi Cad., Ankara",
    timestamp: Date.now() - 7200000,
    status: "inceleniyor",
    criticality: "kritik",
  },
];

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(SAMPLE_REPORTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportsApi = getReportsApiClient();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const data = await reportsApi.getReports();
      if (data && data.length > 0) {
        setReports(data);
      }
    } catch (err: any) {
      console.warn("Failed to fetch reports from API, using sample data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addReport = async (
    report: Omit<Report, "id" | "timestamp" | "status" | "criticality">,
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const criticality = analyzeCriticality(report.description, report.category);
      const newReport: Report = {
        ...report,
        id: Date.now().toString(),
        timestamp: Date.now(),
        status: "beklemede",
        criticality,
      };

      try {
        await reportsApi.createReport(report as CreateReportRequest);
      } catch (apiErr) {
        console.warn("Failed to create report on API, adding locally", apiErr);
      }

      setReports((prev) => [newReport, ...prev]);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to add report";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <ReportContext.Provider
      value={{ reports, isLoading, error, addReport, fetchReports, clearError }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportContext);
  if (!context)
    throw new Error("useReports must be used within ReportProvider");
  return context;
}
