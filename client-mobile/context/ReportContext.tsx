import { createContext, ReactNode, useContext, useState, useEffect, useRef } from "react";
import { getReportsApiClient, type Report } from "@/services/reportsApi";
import { useAuth } from "@/context/AuthContext";

export type { Report };

interface ReportContextType {
  reports: Report[];
  isLoading: boolean;
  error: string | null;
  addReport: (report: {
    image: string;
    userDescription?: string;
    userCategory?: string;
    userCategoryLabel?: string;
    latitude: number;
    longitude: number;
    address: string;
  }) => Promise<boolean>;
  fetchReports: () => Promise<void>;
  clearError: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);


export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportsApi = getReportsApiClient();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      fetchReports();
    } else {
      setReports([]);
    }
  }, [isLoggedIn]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isLoggedIn) return;
    const hasPending = reports.some((r) => r.status === 'pending' || r.status === 'in_review');
    if (hasPending) {
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchReports, 8000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [reports, isLoggedIn]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const data = await reportsApi.getReports();
      setReports(data ?? []);
    } catch (err: any) {
      console.warn("Failed to fetch reports from API, using sample data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addReport = async (report: {
    image: string;
    userDescription?: string;
    userCategory?: string;
    userCategoryLabel?: string;
    latitude: number;
    longitude: number;
    address: string;
  }): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await reportsApi.createReport({
        image: report.image,
        userDescription: report.userDescription,
        userCategory: report.userCategory,
        latitude: report.latitude,
        longitude: report.longitude,
      });

      await fetchReports();
      return true;
    } catch (err: any) {
      setError(err.message || "Rapor gönderilemedi");
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
