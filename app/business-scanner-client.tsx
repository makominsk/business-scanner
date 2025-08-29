"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  MapPin,
  Building2,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Eye,
  Settings,
  HelpCircle,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { BusinessRecord, ScanRequestSchema } from "@/lib/schemas"
import { ThemeToggle } from "@/components/theme-toggle"
import PlanetCanvas from "@/components/planet-canvas"
// Планета отключена до установки 3D-зависимостей

type ScanFormInputs = z.infer<typeof ScanRequestSchema>;

interface ScanProgress {
  status: 'started' | 'progress' | 'completed' | 'error';
  jobId?: string;
  message: string;
  progress: number;
  foundCount?: number;
  processedCount?: number;
  sheetUrl?: string;
  details?: any;
}

export default function BusinessScanner() {
  const [currentStage, setCurrentStage] = useState<"search" | "progress" | "results">("search")
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [results, setResults] = useState<BusinessRecord[]>([]);
  const [sheetLink, setSheetLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ScanFormInputs>({
    resolver: zodResolver(ScanRequestSchema),
    defaultValues: {
      region: "",
      activity: "",
    },
  });

  const onSubmit = async (data: ScanFormInputs) => {
    setCurrentStage("progress");
    setScanProgress({ status: 'started', message: 'Инициализация сканирования...', progress: 0 });
    setResults([]);
    setSheetLink(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setScanProgress({ status: 'error', message: 'Ошибка при запуске сканирования', progress: 0, details: errorData.error || 'Неизвестная ошибка' });
        setCurrentStage("search");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get reader for SSE stream.");
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream finished.");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventString of events) {
          if (eventString.startsWith('event: message\ndata: ')) {
            try {
              const dataString = eventString.substring('event: message\ndata: '.length);
              const eventData: ScanProgress = JSON.parse(dataString);
              setScanProgress(eventData);

              if (eventData.status === 'completed') {
                setSheetLink(eventData.sheetUrl || null);
                setCurrentStage("results");
                reset();
              } else if (eventData.status === 'error') {
                setCurrentStage("search");
                reset();
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError, eventString);
            }
          }
        }
      }

    } catch (error) {
      console.error("Fetch error:", error);
      setScanProgress({ status: 'error', message: 'Сетевая ошибка или ошибка сервера', progress: 0, details: (error as Error).message });
      setCurrentStage("search");
      reset();
    }
  };

  useEffect(() => {
    if (scanProgress?.status === 'completed' && scanProgress.foundCount) {
      setResults(Array(scanProgress.foundCount).fill({
        name: "Загрузка...",
        address_full: "",
        categories: [],
        rating: 0,
        phone_e164: "",
        website: "",
        emails: [],
        socials: {},
        place_id: "",
        collected_at: "",
        region_query: "",
        activity_query: "",
        location: { lat: 0, lng: 0 },
        source: "rapidapi-local-business-data",
      }));
    }
  }, [scanProgress]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="moving-dots">
        {Array.from({ length: 16 }).map((_, i) => {
          const style = {
            ['--i' as any]: String(Math.random()),
            ['--j' as any]: String(Math.random()),
            ['--size' as any]: `${4 + Math.random() * 5}px`,
            ['--dur' as any]: `${10 + Math.random() * 10}s`,
            ['--delay' as any]: `${-Math.random() * 10}s`,
          } as React.CSSProperties
          return <div key={i} className="dot" style={style} />
        })}
      </div>

      {/* 3D-планета на фоне под поиском рендерится ниже, внутри секции */}
      <header className="relative z-10 nav-glass">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Business Scanner</h1>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-16">
        {currentStage === "search" && (
          <div className="max-w-6xl mx-auto animate-in fade-in-0 zoom-in-95 duration-500 relative">
            {/* Планета под блоком поиска */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <div className="w-[765px] h-[765px] md:w-[935px] md:h-[935px] opacity-40">
                <PlanetCanvas embedded className="rounded-full" />
              </div>
            </div>
            <div className="relative z-10">
            <div className="text-center mb-20">
              <h1 className="text-6xl md:text-8xl font-bold gradient-text-large mb-8 leading-tight">
                Business Scanner
              </h1>
              <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Получите полную базу контактов компаний в выбранном регионе за считанные секунды! Пишите, звоните,
                налаживайте связи, стройте бизнес!
              </p>
            </div>

            <div className="glass-card rounded-3xl p-12 max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-4">Сбор контактных данных</h2>
                <p className="text-lg text-slate-300">Укажите регион и тип бизнеса для сбора контактов</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label htmlFor="region" className="text-white font-medium flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-cyan-400 icon-glow" />
                      Регион
                    </label>
                    <Input
                      id="region"
                      placeholder="Минск, Беларусь"
                      {...register("region")}
                      className="h-12 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                    {errors.region && <p className="text-red-500 text-sm">{errors.region.message}</p>}
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="activity" className="text-white font-medium flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-cyan-400 icon-glow" />
                      Деятельность
                    </label>
                    <Input
                      id="activity"
                      placeholder="автосервис, кафе, магазин"
                      {...register("activity")}
                      className="h-12 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                    {errors.activity && <p className="text-red-500 text-sm">{errors.activity.message}</p>}
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="h-14 px-8 btn-gradient font-semibold text-lg rounded-xl block mx-auto">
                  {isSubmitting ? "Запуск..." : "Собрать контакты"}
                </Button>
              </form>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              <div className="text-center feature-card p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">24/7</h3>
                <p className="text-slate-300">Сбор контактов работает в любое время суток без перерывов</p>
              </div>

              <div className="text-center feature-card p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Точная информация</h3>
                <p className="text-slate-300">Актуальные контакты с проверкой через ИИ и множественные источники</p>
              </div>

              <div className="text-center feature-card p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Скорость получения результата</h3>
                <p className="text-slate-300">Полная база контактов готова за несколько минут</p>
              </div>
            </div>
            </div>
          </div>
        )}

        {currentStage === "progress" && scanProgress && (
          <div className="max-w-4xl mx-auto animate-in fade-in-0 zoom-in-95 duration-500">
            <div className="glass-card rounded-3xl p-12">
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Сбор контактных данных</h3>
                <p className="text-slate-300 text-lg">
                  {scanProgress.message}
                </p>
                {scanProgress.status === 'error' && scanProgress.details && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Ошибка сканирования</AlertTitle>
                    <AlertDescription>
                      {JSON.stringify(scanProgress.details)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Прогресс</span>
                    <span className="text-3xl font-bold gradient-text">{Math.round(scanProgress.progress)}%</span>
                  </div>
                  <Progress value={scanProgress.progress} className="h-4 bg-slate-700" />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center p-6 feature-card rounded-2xl">
                    <div className="text-4xl font-bold gradient-text mb-2">{scanProgress.foundCount ?? 0}</div>
                    <div className="text-slate-300">Найдено</div>
                  </div>
                  <div className="text-center p-6 feature-card rounded-2xl">
                    <div className="text-4xl font-bold gradient-text mb-2">{scanProgress.processedCount ?? 0}</div>
                    <div className="text-slate-300">Обработано</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStage === "results" && (
          <div className="space-y-8 animate-in fade-in-0 zoom-in-95 duration-500">
            <div className="glass-card rounded-3xl p-12">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">Результаты</h2>
                  <p className="text-slate-300 text-lg">Найдено {results.length} компаний • Контакты собраны ИИ</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Просмотр
                  </Button>
                  {sheetLink && (
                    <a href={sheetLink} target="_blank" rel="noopener noreferrer">
                      <Button className="btn-gradient">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть таблицу в Google
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {(scanProgress?.status === 'progress' || results.length === 0) && (
                Array.from({ length: scanProgress?.foundCount || 3 }).map((_, index) => (
                  <BusinessCardSkeleton key={index} />
                ))
              )}

              {!(scanProgress?.status === 'progress' || results.length === 0) && (
                results.map((business, index) => (
                  <div key={index} className="glass-card rounded-2xl p-8">
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-bold text-white">{business.name}</h3>
                          {business.rating && (
                            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1 rounded-full">
                              <span className="text-white font-medium">★ {business.rating}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin className="w-4 h-4 text-cyan-400" />
                          <span>{business.address_full}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {business.categories.map((category, i) => (
                            <Badge key={i} variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {business.phone_e164 && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-4 h-4 text-cyan-400" />
                            <span>{business.phone_e164}</span>
                          </div>
                        )}

                        {business.website && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Globe className="w-4 h-4 text-cyan-400" />
                            <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                              {business.website}
                            </a>
                          </div>
                        )}

                        {business.emails.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 mt-1 text-cyan-400" />
                            <div className="flex flex-wrap gap-1">
                              {business.emails.map((email, i) => (
                                <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-300">
                                  {email}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {Object.keys(business.socials).length > 0 && (
                          <div className="flex items-start gap-2">
                            <ExternalLink className="w-4 h-4 mt-1 text-cyan-400" />
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(business.socials).map(([platform, url], i) => {
                                if (!url) return null;
                                if (Array.isArray(url)) {
                                  return url.map((item, j) => (
                                    <a key={`${i}-${j}`} href={item} target="_blank" rel="noopener noreferrer">
                                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-300 capitalize">
                                        {platform}
                                      </Badge>
                                    </a>
                                  ));
                                }
                                return (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300 capitalize">
                                      {platform}
                                    </Badge>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="text-center pt-8">
              <Button
                onClick={() => setCurrentStage("search")}
                variant="outline"
                className="px-8 py-3 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Новый поиск
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const BusinessCardSkeleton = React.memo(() => (
  <div className="glass-card rounded-2xl p-8">
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  </div>
));
