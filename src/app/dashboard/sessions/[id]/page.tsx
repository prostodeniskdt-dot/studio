'use client';

import * as React from 'react';
import { useParams, useRouter } from "next/navigation";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, MoreVertical, Trash2, Download, Upload, PlusCircle } from "lucide-react";
import Link from "next/link";
import { translateStatus, buildProductDisplayName } from "@/lib/utils";
import type { InventorySession, Product, InventoryLine, CalculatedInventoryLine } from '@/lib/types';
import { useAuthSession } from '@/contexts/auth-context';
import { useProducts } from '@/contexts/products-context';
import { useSessions } from '@/contexts/sessions-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Combobox } from '@/components/ui/combobox';
import { translateCategory } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { calculateLineFields } from '@/lib/calculations';
import { splitDelimitedQuotedRow, type ParsedSessionFile } from '@/lib/inventory-import/session-file-import';
import { findBestProductMatch, type ProductMatchCandidate } from '@/lib/inventory-import/match';
import { resolveImportRowEconomics } from '@/lib/inventory-import/row-handling';
import { guessCategoryFromText } from '@/lib/inventory-import/category-guess';
import { SessionHeader } from '@/components/sessions/session-header';
import { SessionActions } from '@/components/sessions/session-actions';
import { HelpIcon } from '@/components/ui/help-icon';
import { Progress } from '@/components/ui/progress';
import { WifiOff, AlertTriangle } from 'lucide-react';
import {
  buildSessionExportAoa,
  DEFAULT_EXPORT_PREF,
  downloadSessionExport,
  loadExportPreference,
  preferenceFromImport,
  saveExportPreference,
  type SessionExportPreference,
} from '@/lib/session-export/mirror-format';
import {
  patchInventorySessionInLineChunks,
  SESSION_PATCH_LINES_CHUNK_SIZE,
  chunkArray,
} from '@/lib/sessions/chunked-patch';

export default function SessionPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthSession();
  const { removeSession, addSession } = useSessions();
  const { toast } = useToast();
  const router = useRouter();

  const barId = user ? `bar_${user.id}` : null;
  
  const [isDeletingSession, setIsDeletingSession] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deleteProgress, setDeleteProgress] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [localLines, setLocalLines] = React.useState<InventoryLine[] | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isAddingProduct, setIsAddingProduct] = React.useState(false);

  const [session, setSession] = React.useState<InventorySession | null>(null);
  const [lines, setLines] = React.useState<InventoryLine[] | null>(null);
  const [isLoadingSession, setIsLoadingSession] = React.useState(false);
  const [isLoadingLines, setIsLoadingLines] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<Error | null>(null);

  const [exportPref, setExportPref] = React.useState<SessionExportPreference | null>(null);

  React.useEffect(() => {
    setExportPref(loadExportPreference(id));
  }, [id]);

  const hasNavigatedRef = React.useRef(false);
  const [cachedSession, setCachedSession] = React.useState<InventorySession | null>(null);
  
  // Использовать кэшированную сессию если реальная еще не загружена
  const effectiveSession = session || cachedSession;

  // Использовать контекст продуктов вместо прямой загрузки
  const { products: allProducts, isLoading: isLoadingProducts, refresh: refreshProducts } = useProducts();

  // Проверить sessionStorage для новых сессий (исправление race condition)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const cachedData = sessionStorage.getItem(`session_${id}`);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.isNew) {
          // Использовать кэшированные данные временно
          setCachedSession({
            ...parsed,
            createdAt: parsed.createdAt ? { 
              toDate: () => new Date(parsed.createdAt), 
              toMillis: () => new Date(parsed.createdAt).getTime() 
            } as { toDate: () => Date; toMillis: () => number } : undefined,
          } as InventorySession);
        }
      } catch (e) {
        // Игнорировать ошибки парсинга
      }
    }
  }, [id]);

  // Очистить sessionStorage после успешной загрузки
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session && cachedSession) {
      sessionStorage.removeItem(`session_${id}`);
      setCachedSession(null);
    }
  }, [session, id, cachedSession]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      // Чтобы при смене URL сессии не остались строки прошлой — иначе повторный импорт шлёт чужие line id.
      setSession(null);
      setLines(null);
      setLocalLines(null);
      setIsLoadingSession(true);
      setIsLoadingLines(true);
      setSessionError(null);
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed to load session');
        if (!cancelled) {
          setSession(json.session ?? null);
          setLines(json.lines ?? []);
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (!cancelled) setSessionError(err);
      } finally {
        if (!cancelled) {
          setIsLoadingSession(false);
          setIsLoadingLines(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  React.useEffect(() => {
    // Использовать кэшированную сессию если есть, иначе проверять загрузку
    const currentSession = session || cachedSession;
    
    // Увеличить таймаут для проверки несуществующей сессии
    if (!isLoadingSession && !currentSession && !sessionError && !hasNavigatedRef.current) {
      // Подождать дополнительно для новых сессий
      const isNewSession = cachedSession !== null;
      const timeout = isNewSession ? 2000 : 500; // 2 секунды для новых, 500ms для старых
      
      const timer = setTimeout(() => {
        if (!session && !isLoadingSession && !cachedSession) {
          hasNavigatedRef.current = true;
          toast({
            variant: 'destructive',
            title: 'Инвентаризация не найдена',
            description: 'Возможно, она была удалена. Перенаправляем на список инвентаризаций.',
          });
          router.replace('/dashboard/sessions');
        }
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [isLoadingSession, session, cachedSession, sessionError, router, toast]);

  // Обработка ошибок загрузки сессии
  React.useEffect(() => {
    if (sessionError) {
      console.error('Error loading session:', sessionError);
      hasNavigatedRef.current = true;
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки инвентаризации',
        description: sessionError instanceof Error 
          ? sessionError.message 
          : 'Не удалось загрузить данные инвентаризации. Проверьте подключение к интернету.',
      });
      // Не перенаправлять автоматически, дать пользователю возможность повторить
    }
  }, [sessionError, toast]);

  React.useEffect(() => {
    if (lines) {
      setLocalLines(lines);
    } else {
      setLocalLines([]);
    }
  }, [lines]);

  const originalLines = React.useMemo(() => lines, [lines]);

  const hasUnsavedChanges = React.useMemo(() => {
    if (!originalLines || !localLines) return false;
    if (originalLines.length !== localLines.length) return true;
    return JSON.stringify(originalLines) !== JSON.stringify(localLines);
  }, [originalLines, localLines]);
  
  const productsInSession = React.useMemo(() => {
    if (!localLines) return new Set();
    return new Set(localLines.map(line => line.productId));
  }, [localLines]);
  
  const groupedProductOptions = React.useMemo(() => {
    if (!allProducts) return [];
    const availableProducts = allProducts.filter(p => p.isActive && !productsInSession.has(p.id));
    const groups: Record<string, { value: string; label: string }[]> = {};
    availableProducts.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: buildProductDisplayName(p.name, p.bottleVolumeMl) });
    });
    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [allProducts, productsInSession]);
  
  
  // Event Handlers
  const handleDeleteSession = async () => {
    if (!user) return;

    setIsDeletingSession(true);
    setIsDeleteDialogOpen(false);
    setDeleteProgress(0);

    try {
      setDeleteProgress(25);
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
      setDeleteProgress(100);
      removeSession(id);
      toast({ title: "Инвентаризация удалена." });
      router.replace("/dashboard/sessions");
    } catch(e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Произошла неизвестная ошибка.";
        toast({ 
            variant: "destructive", 
            title: "Не удалось удалить инвентаризацию", 
            description: errorMessage
        });
        // Reset deleting state on error so user can try again
        setIsDeletingSession(false);
    } finally {
        setDeleteProgress(0);
    }
  };
  
  const handleAddToOrder = async (line: CalculatedInventoryLine & { product: Product }) => {
    if (!user || !barId || !allProducts) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось определить пользователя или подключение к базе данных',
      });
      return;
    }

    if (!line.product.reorderQuantity) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'У продукта не указано рекомендуемое количество заказа. Укажите его в настройках продукта.',
      });
      return;
    }

    try {
      const supplierId = line.product.defaultSupplierId || '';

      const ordersRes = await fetch('/api/purchase-orders', {
        cache: 'no-store',
      });
      const ordersJson = await ordersRes.json();
      if (!ordersRes.ok || ordersJson?.ok === false) throw new Error(ordersJson?.error || 'Failed');
      const orders = (ordersJson.orders ?? []) as Array<{ id: string; supplierId: string; status: string }>;

      let orderId = orders.find((o) => o.status === 'draft' && o.supplierId === supplierId)?.id;
      if (!orderId) {
        const createRes = await fetch('/api/purchase-orders', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            order: {
              supplierId,
              status: 'draft',
              orderDate: new Date().toISOString(),
            },
          }),
        });
        const createJson = await createRes.json();
        if (!createRes.ok || createJson?.ok === false) throw new Error(createJson?.error || 'Failed');
        orderId = createJson.order?.id;
      }
      if (!orderId) throw new Error('Order not created');

      await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ addLine: { productId: line.product.id } }),
      });

      toast({
        title: 'Продукт добавлен в заказ',
        description: `${buildProductDisplayName(line.product.name, line.product.bottleVolumeMl)} добавлен в заказ${line.product.defaultSupplierId ? '' : ' (без указания поставщика)'}.`,
      });
    } catch (error) {
      console.error('Error adding to order:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка при добавлении в заказ',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  const handleAddProductToSession = async (productId: string) => {
    if (!productId || !user) return;
    setIsAddingProduct(true);
    try {
      const product = allProducts?.find(p => p.id === productId);
      if (!product) throw new Error("Продукт не найден");

      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ addProductLine: { productId } }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');

      setSession(json.session ?? null);
      setLines(json.lines ?? []);
      toast({ title: "Продукт добавлен", description: `"${buildProductDisplayName(product.name, product.bottleVolumeMl)}" добавлен в инвентаризацию.` });
      setIsAddProductOpen(false);
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось добавить продукт';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
    } finally {
        setIsAddingProduct(false);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!localLines || !user) return;
    setIsSaving(true);
    try {
      const payloadLines =
        localLines
          .map((line) => {
            const product = allProducts?.find((p) => p.id === line.productId);
            if (!product) return null;
            const calculatedFields = calculateLineFields(line, product);
            const { startStock, purchases, sales, endStock } = line;
            return {
              id: line.id,
              productId: line.productId,
              stockMode: line.stockMode === 'pieces' ? 'pieces' : 'volume_ml',
              startStock,
              purchases,
              sales,
              endStock,
              theoreticalEndStock: calculatedFields.theoreticalEndStock,
              differenceVolume: calculatedFields.differenceVolume,
              differenceMoney: calculatedFields.differenceMoney,
              differencePercent: calculatedFields.differencePercent ?? 0,
            };
          })
          .filter(Boolean) as any[];

      let lastSession: InventorySession | null = null;
      let lastLines: InventoryLine[] = [];
      for (const chunk of chunkArray(payloadLines, SESSION_PATCH_LINES_CHUNK_SIZE)) {
        const res = await fetch(`/api/sessions/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ upsertLines: chunk }),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
        lastSession = json.session ?? lastSession;
        lastLines = (json.lines as InventoryLine[]) ?? lastLines;
      }

      setSession(lastSession);
      setLines(lastLines);
      toast({ title: "Изменения сохранены" });
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось сохранить изменения';
        toast({
            variant: "destructive",
            title: "Ошибка сохранения",
            description: errorMessage,
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!user) return;
    setIsCompleting(true);
    try {
      if (hasUnsavedChanges) {
          await handleSaveChanges();
      }
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ session: { status: 'completed', closedAt: new Date().toISOString() } }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
      const closed = json.session as InventorySession | null | undefined;
      setSession(closed ?? null);
      if (closed) {
        addSession(closed);
      }
      toast({
          title: "Инвентаризация завершена",
          description: "Инвентаризация завершена.",
      });
      router.push('/dashboard/sessions');
    } catch(serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось завершить инвентаризацию';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
    } finally {
      setIsCompleting(false);
    }
  };
  
  const handleSessionExport = React.useCallback(
    async (mode: 'mirror' | 'csv' | 'xlsx' | 'pdf') => {
      if (!localLines || !allProducts) return;
      const template = exportPref ?? DEFAULT_EXPORT_PREF;
      const ext = mode === 'mirror' ? template.ext : mode;
      const pref = { ...template, ext };
      const productById = new Map(allProducts.map((p) => [p.id, p] as const));
      const aoa = buildSessionExportAoa(pref, localLines, productById, {
        sessionName: effectiveSession?.name,
        barName: typeof user?.profile?.establishment === 'string' ? user.profile.establishment : undefined,
      });
      const title = effectiveSession?.name?.trim() || 'Инвентаризация';
      try {
        await downloadSessionExport(aoa, pref, id, title);
        toast({
          title: 'Экспорт завершен',
          description:
            ext === 'xlsx'
              ? 'Excel: ширина колонок подобрана автоматически, позиции сгруппированы по категориям.'
              : ext === 'pdf'
                ? 'PDF: векторная таблица, кириллица (Noto Sans), удобно для печати.'
                : 'Файл сохранён. В таблице добавлена группировка по категориям, как в приложении.',
        });
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Ошибка экспорта',
          description: e instanceof Error ? e.message : 'Не удалось сохранить файл.',
        });
      }
    },
    [localLines, allProducts, exportPref, effectiveSession?.name, user?.profile?.establishment, id, toast]
  );

  const exportButtonLabel =
    exportPref?.ext === 'xlsx'
      ? 'Экспорт в Excel'
      : exportPref?.ext === 'pdf'
        ? 'Экспорт в PDF'
        : 'Экспорт в CSV';

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const clearInput = () => {
      if (event.target) event.target.value = '';
    };

    if (!file || !user || !barId) {
      toast({
        variant: 'destructive',
        title: 'Импорт не удался',
        description: 'Войдите в аккаунт и повторите попытку.',
      });
      clearInput();
      return;
    }

    if (isLoadingProducts) {
      toast({
        variant: 'destructive',
        title: 'Импорт не удался',
        description: 'Список продуктов загружается. Подождите и повторите попытку.',
      });
      clearInput();
      return;
    }

    setIsImporting(true);
    const parseController = new AbortController();
    const parseTimeoutId = window.setTimeout(() => parseController.abort(), 180_000);
    try {
      const fd = new FormData();
      fd.set('file', file);

      let res: Response;
      try {
        res = await fetch('/api/inventory/parse-session-import', {
          method: 'POST',
          body: fd,
          credentials: 'include',
          signal: parseController.signal,
        });
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          toast({
            variant: 'destructive',
            title: 'Таймаут',
            description:
              'Разбор файла занял слишком долго (больше 3 мин). Попробуйте файл меньшего размера или сохраните как CSV/XLSX.',
          });
          clearInput();
          return;
        }
        throw e;
      } finally {
        clearTimeout(parseTimeoutId);
      }
      const j = (await res.json()) as {
        ok?: boolean;
        parsed?: ParsedSessionFile;
        error?: string;
        hint?: string;
      };

      if (!res.ok || j.ok !== true) {
        toast({
          variant: 'destructive',
          title: 'Импорт не удался',
          description: j.hint ?? j.error ?? 'Не удалось прочитать файл. Войдите в аккаунт и проверьте формат.',
        });
        clearInput();
        return;
      }

      const parsed = j.parsed!;

      if (parsed.kind === 'unknown') {
        toast({
          variant: 'destructive',
          title: 'Формат не распознан',
          description:
            'Поддерживаются: CSV, Excel (XLSX, XLS) и PDF. Форматы данных: 1) выгрузка приложения (CSV/XLSX); 2) строки с id продукта (cuid) в первой ячейке; 3) бланк (Код, Наименование, ед. изм.); 4) расширенный бланк с «Группа» и «Наименование». Экспорт PDF формирует векторную таблицу с кириллицей; для дальнейшего редактирования удобен Excel.',
        });
        clearInput();
        return;
      }

      const mirrorPref = preferenceFromImport(file, parsed);
      if (mirrorPref) {
        setExportPref(mirrorPref);
        saveExportPreference(id, mirrorPref);
      }

      /* use server-parsed result (same branches as before) */
      if (parsed.kind === 'legacy_id') {
        const updatedLines = [...(localLines || [])];
        let changesMade = false;
        const csvData = new Map<
          string,
          { startStock: number; purchases: number; sales: number; endStock: number }
        >();

        const delim = parsed.delimiter;
        parsed.bodyLines.forEach((rowStr) => {
          if (!rowStr.trim()) return;
          const rowData = splitDelimitedQuotedRow(rowStr, delim);
          const productId = rowData[0];
          if (!productId) return;
          csvData.set(productId, {
            startStock: parseFloat(rowData[2] ?? ''),
            purchases: parseFloat(rowData[3] ?? ''),
            sales: parseFloat(rowData[4] ?? ''),
            endStock: parseFloat(rowData[5] ?? ''),
          });
        });

        updatedLines.forEach((line, index) => {
          if (csvData.has(line.productId)) {
            const data = csvData.get(line.productId)!;
            updatedLines[index] = {
              ...line,
              startStock: isNaN(data.startStock) ? line.startStock : data.startStock,
              purchases: isNaN(data.purchases) ? line.purchases : data.purchases,
              sales: isNaN(data.sales) ? line.sales : data.sales,
              endStock: isNaN(data.endStock) ? line.endStock : data.endStock,
            };
            changesMade = true;
          }
        });

        if (!changesMade) {
          toast({
            variant: 'destructive',
            title: 'Импорт не удался',
            description:
              'В файле не найдено строк с productId текущих позиций. Для бланка бухгалтера используйте CSV с точкой с запятой или экспортируйте таблицу из приложения и заполните остатки.',
          });
        } else {
          setLocalLines(updatedLines);
          toast({
            title: 'Импорт завершен',
            description: 'Данные загружены в таблицу. Сохраните изменения.',
          });
        }
        clearInput();
        return;
      }

      if (parsed.kind === 'app_export') {
        const updatedLines = [...(localLines || [])];
        let changesMade = false;
        const appDelim = parsed.delimiter;
        for (const rowStr of parsed.bodyLines) {
          if (!rowStr.trim()) continue;
          const cells = splitDelimitedQuotedRow(rowStr, appDelim);
          if (cells.length < 2) continue;
          const displayName = cells[0]!.trim();
          const endVal = Number(String(cells[1]).replace(/\s/g, '').replace(',', '.'));
          if (!displayName || Number.isNaN(endVal)) continue;
          const idx = updatedLines.findIndex((line) => {
            const product = allProducts.find((p) => p.id === line.productId);
            if (!product) return false;
            return (
              buildProductDisplayName(product.name, product.bottleVolumeMl).trim() === displayName
            );
          });
          if (idx >= 0) {
            updatedLines[idx] = { ...updatedLines[idx]!, endStock: endVal };
            changesMade = true;
          }
        }
        if (!changesMade) {
          toast({
            variant: 'destructive',
            title: 'Импорт не удался',
            description:
              'Ни одно наименование из файла не совпало с продуктами в этой инвентаризации. Сначала добавьте позиции или импортируйте бланк со страницы списка инвентаризаций.',
          });
        } else {
          setLocalLines(updatedLines);
          toast({
            title: 'Импорт завершен',
            description: 'Остатки обновлены по совпадающим названиям. Сохраните изменения.',
          });
        }
        clearInput();
        return;
      }

      const wantPremix =
        file.name.toLowerCase().includes('заготов') || file.name.toLowerCase().includes('zagotov');

      const toCandidates = (): ProductMatchCandidate[] =>
        allProducts
          .filter((p) => {
            const prem = Boolean(p.isPremix || p.category === 'Premix');
            return prem === wantPremix;
          })
          .map((p) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode ?? null,
            externalCode: p.externalCode ?? null,
            isPremix: Boolean(p.isPremix || p.category === 'Premix'),
          }));

      const mutableCandidates = toCandidates();
      let currentLines: InventoryLine[] = [...(localLines || [])];
      const createdByImport = new Map<string, Product>();

      type LineAdd = { productId: string; stockMode: 'volume_ml' | 'pieces'; endStock: number };
      const addsByProduct = new Map<string, LineAdd>();
      const upsertByLineId = new Map<
        string,
        {
          id: string;
          productId: string;
          stockMode: 'volume_ml' | 'pieces';
          startStock: number;
          purchases: number;
          sales: number;
          endStock: number;
          theoreticalEndStock: number;
          differenceVolume: number;
          differenceMoney: number;
          differencePercent: number;
        }
      >();

      for (const row of parsed.rows) {
        const econ = resolveImportRowEconomics(row);
        const match = findBestProductMatch(row, mutableCandidates, wantPremix);
        let productId = match?.productId;

        if (!productId) {
          const category = wantPremix ? 'Premix' : guessCategoryFromText(row.group, row.name);
          const resPost = await fetch('/api/products', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              product: {
                name: row.name,
                category,
                bottleVolumeMl: econ.defaultBottleMl,
                usesVolumeCalculator: econ.usesVolumeCalculator,
                isPremix: wantPremix,
                ...(wantPremix ? { costCalculationMode: 'manual' as const } : {}),
                isInLibrary: false,
                isActive: true,
                externalCode: row.code?.trim() || null,
                barcode: row.barcode?.replace(/\s/g, '') || null,
              },
            }),
          });
          const j = await resPost.json();
          if (!resPost.ok || j?.ok === false || !j?.product?.id) {
            throw new Error(j?.error || 'Не удалось создать продукт при импорте');
          }
          const createdProd = j.product as Product;
          createdByImport.set(createdProd.id, createdProd);
          productId = createdProd.id;
          mutableCandidates.push({
            id: createdProd.id,
            name: createdProd.name,
            barcode: createdProd.barcode ?? null,
            externalCode: createdProd.externalCode ?? null,
            isPremix: Boolean(createdProd.isPremix || createdProd.category === 'Premix'),
          });
        }

        const productForCalc =
          allProducts.find((p) => p.id === productId) ?? createdByImport.get(productId) ?? null;
        if (!productForCalc) {
          throw new Error('Не удалось сопоставить продукт для расчёта строки');
        }

        const existingLine = currentLines.find((l) => l.productId === productId);
        if (existingLine) {
          const calc = calculateLineFields(
            {
              ...existingLine,
              endStock: econ.endStock,
              stockMode: econ.stockMode,
            },
            productForCalc
          );
          upsertByLineId.set(existingLine.id, {
            id: existingLine.id,
            productId,
            stockMode: econ.stockMode,
            startStock: existingLine.startStock,
            purchases: existingLine.purchases,
            sales: existingLine.sales,
            endStock: econ.endStock,
            theoreticalEndStock: calc.theoreticalEndStock,
            differenceVolume: calc.differenceVolume,
            differenceMoney: calc.differenceMoney,
            differencePercent: calc.differencePercent,
          });
        } else {
          addsByProduct.set(productId, {
            productId,
            stockMode: econ.stockMode,
            endStock: econ.endStock,
          });
        }
      }

      const addPayload = [...addsByProduct.values()];
      const upserts = [...upsertByLineId.values()];
      if (upserts.length > 0 || addPayload.length > 0) {
        const jb = await patchInventorySessionInLineChunks(id, {
          ...(addPayload.length > 0 ? { addProductLines: addPayload } : {}),
          ...(upserts.length > 0 ? { upsertLines: upserts } : {}),
        });
        currentLines = jb.lines ?? currentLines;
      }

      setLocalLines(currentLines);
      setLines(currentLines);
      if (barId && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`barboss_products_cache_${barId}`);
        } catch {
          /* ignore */
        }
      }
      void refreshProducts();
      toast({
        title: 'Импорт завершен',
        description: `Обработано позиций: ${parsed.rows.length}. Новые продукты добавлены в каталог при необходимости.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка импорта',
        description: err instanceof Error ? err.message : 'Проверьте формат файла (CSV, Excel или PDF).',
      });
    } finally {
      setIsImporting(false);
      clearInput();
    }
  };
  
  // Показывать loading только если нет кэшированной сессии
  if (isLoadingSession && !cachedSession) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Использовать effectiveSession для проверки существования
  if (!effectiveSession) {
    // Проверка уже обработана в useEffect с таймаутом
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Явное отображение ошибки загрузки
  if (sessionError && !isLoadingSession) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Alert className="max-w-md" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка загрузки</AlertTitle>
          <AlertDescription>
            {sessionError instanceof Error 
              ? sessionError.message 
              : 'Не удалось загрузить инвентаризацию. Попробуйте обновить страницу.'}
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1"
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const isLoading = (isLoadingSession || isLoadingLines || isLoadingProducts) && !sessionError;
  const isEditable = effectiveSession.status === 'in_progress';

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".csv,.xlsx,.xls,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      />
      <SessionHeader session={effectiveSession} isEditable={isEditable} />
      {isEditable && (
        <div className="mb-4 flex items-center gap-2">
          <HelpIcon 
            description="Используйте калькулятор для расчета остатков. Результаты автоматически появятся в таблице. Проверьте фактические остатки и завершите инвентаризацию."
          />
          <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
        </div>
      )}
      <SessionActions
        isEditable={isEditable}
        isSaving={isSaving}
        isCompleting={isCompleting}
        isDeleting={isDeletingSession}
        deleteProgress={deleteProgress}
        hasUnsavedChanges={hasUnsavedChanges}
        sessionName={effectiveSession.name}
        onAddProduct={() => setIsAddProductOpen(true)}
        onSave={handleSaveChanges}
        onComplete={handleCompleteSession}
        onDelete={handleDeleteSession}
        onImportClick={handleImportClick}
        onSessionExport={handleSessionExport}
        exportButtonLabel={exportButtonLabel}
        isImporting={isImporting}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
      />
      <div className="min-w-0 w-full">
       {isLoading ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (localLines && allProducts && (
        <InventoryTable 
            lines={localLines} 
            setLines={setLocalLines} 
            products={allProducts}
            isEditable={isEditable}
            onAddToOrder={handleAddToOrder}
        />
      ))}
      </div>
       <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Добавить продукт в инвентаризацию</DialogTitle>
            <DialogDescription>
                Выберите продукт из общего каталога, чтобы добавить его в текущую инвентаризацию.
            </DialogDescription>
            </DialogHeader>
            <Combobox 
                options={groupedProductOptions}
                onSelect={(value) => {
                    handleAddProductToSession(value);
                }}
                placeholder="Выберите продукт..."
                searchPlaceholder="Поиск продукта..."
                notFoundText="Продукт не найден или уже добавлен."
            />
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Отмена</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить инвентаризацию "{effectiveSession?.name}" и все связанные с ней данные. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSession}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} disabled={isDeletingSession} className="bg-destructive hover:bg-destructive/90">
                {isDeletingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isDeletingSession ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
          {isDeletingSession && deleteProgress > 0 && (
            <div className="px-6 pb-4">
              <Progress value={deleteProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2 text-center">{deleteProgress}%</p>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
