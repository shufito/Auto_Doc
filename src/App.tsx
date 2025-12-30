import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  X,
  Plus,
  Trash2,
  Eye,
  CheckCircle2Icon,
  Circle,
  FileCode2Icon,
  Users2Icon,
  UserIcon,
  CalendarIcon,
  LinkIcon,
  FileTextIcon,
  PaletteIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  statusLabels,
  type PDFColor,
  type Project,
  type ProjectMilestone,
  type ProjectStatus,
  type TechStack,
} from "@/types/projects";
import { Separator } from "@/components/ui/separator";
import { generateProjectPDF } from "@/utils/generatePDF";
import { format } from "date-fns";

const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, "Nome do projeto é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  sector: z
    .string()
    .min(1, "Setor é obrigatório")
    .max(50, "Setor deve ter no máximo 50 caracteres"),
  description: z
    .string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional(),
  status: z.enum([
    "planning",
    "in_progress",
    "completed",
    "on_hold",
    "cancelled",
  ]),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().optional(),
  projectManager: z
    .string()
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  repository: z.url("URL inválida").optional().or(z.literal("")),
  documentation: z.url("URL inválida").optional().or(z.literal("")),
  notes: z
    .string()
    .max(2000, "Notas devem ter no máximo 2000 caracteres")
    .optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const techCategories = [
  "Frontend",
  "Backend",
  "Database",
  "DevOps",
  "Cloud",
  "Testes",
  "Mobile",
  "Outros",
] as const;

const PDF_COLORS: { name: string; color: PDFColor; hex: string }[] = [
  { name: "Roxo", color: { r: 139, g: 92, b: 246 }, hex: "#8B5CF6" },
  { name: "Azul", color: { r: 59, g: 130, b: 246 }, hex: "#3B82F6" },
  { name: "Verde", color: { r: 34, g: 197, b: 94 }, hex: "#22C55E" },
  { name: "Vermelho", color: { r: 239, g: 68, b: 68 }, hex: "#EF4444" },
  { name: "Laranja", color: { r: 249, g: 115, b: 22 }, hex: "#F97316" },
  { name: "Rosa", color: { r: 236, g: 72, b: 153 }, hex: "#EC4899" },
  { name: "Ciano", color: { r: 6, g: 182, b: 212 }, hex: "#06B6D4" },
  { name: "Índigo", color: { r: 99, g: 102, b: 241 }, hex: "#6366F1" },
];

const generateUniqueCode = (): string => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PRJ-${year}-${month}-${random}`;
};

function App() {
  const [uniqueCode] = useState(() => generateUniqueCode());
  const [team, setTeam] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [techStack, setTechStack] = useState<TechStack[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedColor, setSelectedColor] = useState<PDFColor>(
    PDF_COLORS[0].color
  );
  const [newTeamMember, setNewTeamMember] = useState("");
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
  });
  const [newTech, setNewTech] = useState({
    category: "Frontend",
    technology: "",
  });
  const [qrCode, setQrCode] = useState<string>("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uniqueCode) {
      QRCode.toDataURL(uniqueCode, {
        width: 80,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }).then(setQrCode);
    }
  }, [uniqueCode]);

  const formatDate = (date: string | undefined) => {
    if (!date) return "";
    return format(date, "dd/MM/yyyy");
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      sector: "",
      description: "",
      status: "planning",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      projectManager: "",
      repository: "",
      documentation: "",
      notes: "",
    },
    mode: "onChange",
  });

  const { watch } = form;
  const watchedName = watch("name");
  const watchedSector = watch("sector");

  const handleFormSubmit = async (data: ProjectFormValues) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: uniqueCode,
      uniqueCode,
      name: data.name,
      description: data.description || "",
      sector: data.sector,
      status: data.status as ProjectStatus,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      projectManager: data.projectManager || "",
      team,
      milestones,
      techStack,
      repository: data.repository || "",
      documentation: data.documentation || "",
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    // generate PDF blob and show preview in the same page
    const blob = await generateProjectPDF(newProject, selectedColor, {
      returnBlob: true,
    });
    if (blob instanceof Blob) {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPreview(true);
    }
  };

  const addTeamMember = () => {
    if (newTeamMember.trim()) {
      setTeam((prev) => [...prev, newTeamMember.trim()]);
      setNewTeamMember("");
    }
  };

  const removeTeamMember = (index: number) => {
    setTeam((prev) => prev.filter((_, i) => i !== index));
  };

  const addMilestone = () => {
    if (newMilestone.title.trim()) {
      const milestone: ProjectMilestone = {
        id: milestones.length
          ? (parseInt(milestones[milestones.length - 1].id) + 1).toString()
          : "1",
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim(),
        completed: false,
      };
      setMilestones((prev) => [...prev, milestone]);
      setNewMilestone({ title: "", description: "" });
    }
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const addTechnology = () => {
    if (newTech.technology.trim()) {
      const existingStack = techStack.find(
        (s) => s.category === newTech.category
      );

      if (existingStack) {
        setTechStack((prev) =>
          prev.map((s) =>
            s.category === newTech.category
              ? {
                  ...s,
                  technologies: [...s.technologies, newTech.technology.trim()],
                }
              : s
          )
        );
      } else {
        const stack: TechStack = {
          category: newTech.category,
          technologies: [newTech.technology.trim()],
        };
        setTechStack((prev) => [...prev, stack]);
      }
      setNewTech((prev) => ({ ...prev, technology: "" }));
    }
  };

  const removeTechnology = (category: string, tech: string) => {
    setTechStack((prev) =>
      prev
        .map((s) =>
          s.category === category
            ? { ...s, technologies: s.technologies.filter((t) => t !== tech) }
            : s
        )
        .filter((s) => s.technologies.length > 0)
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Novo Projeto</h1>
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Informações Básicas</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="lg:hidden"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? "Ocultar" : "Preview"}
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Projeto *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Sistema de Gestão"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Setor *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: TI, Comercial, RH"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva o objetivo e escopo do projeto..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planning">
                                Planejamento
                              </SelectItem>
                              <SelectItem value="in_progress">
                                Em Andamento
                              </SelectItem>
                              <SelectItem value="completed">
                                Concluído
                              </SelectItem>
                              <SelectItem value="on_hold">Pausado</SelectItem>
                              <SelectItem value="cancelled">
                                Cancelado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectManager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gerente do Projeto</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome do responsável"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Término</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2 mb-3">
                        <PaletteIcon className="h-4 w-4" />
                        Cor do PDF
                      </FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {PDF_COLORS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setSelectedColor(c.color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              selectedColor.r === c.color.r &&
                              selectedColor.g === c.color.g &&
                              selectedColor.b === c.color.b
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newTeamMember}
                        onChange={(e) => setNewTeamMember(e.target.value)}
                        placeholder="Nome do membro"
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addTeamMember())
                        }
                      />
                      <Button
                        type="button"
                        onClick={addTeamMember}
                        variant="outline"
                        size={"icon"}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.map((member, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="gap-1"
                        >
                          {member}
                          <button
                            type="button"
                            onClick={() => removeTeamMember(index)}
                          >
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stack Tecnológica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Select
                        value={newTech.category}
                        onValueChange={(value) =>
                          setNewTech((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {techCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={newTech.technology}
                        onChange={(e) =>
                          setNewTech((prev) => ({
                            ...prev,
                            technology: e.target.value,
                          }))
                        }
                        placeholder="Ex: React, Node.js, PostgreSQL"
                        className="flex-1"
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addTechnology())
                        }
                      />
                      <Button
                        type="button"
                        onClick={addTechnology}
                        variant="outline"
                        size={"icon"}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {techStack.map((stack) => (
                        <div key={stack.category}>
                          <p className="text-sm font-medium mb-1">
                            {stack.category}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {stack.technologies.map((tech) => (
                              <Badge
                                key={tech}
                                variant="outline"
                                className="gap-1"
                              >
                                {tech}
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeTechnology(stack.category, tech);
                                  }}
                                >
                                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pontos do Projeto (Milestones)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        value={newMilestone.title}
                        onChange={(e) =>
                          setNewMilestone((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Título do milestone"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newMilestone.description}
                          onChange={(e) =>
                            setNewMilestone((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Descrição (opcional)"
                        />
                        <Button
                          type="button"
                          onClick={addMilestone}
                          variant="outline"
                          size={"icon"}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {milestones.map((milestone, index) => (
                        <div
                          key={milestone.id}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{milestone.title}</p>
                            {milestone.description && (
                              <p className="text-sm text-muted-foreground">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMilestone(milestone.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Links e Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="repository"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repositório</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://github.com/..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="documentation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Documentação</FormLabel>
                          <FormControl>
                            <Input placeholder="https://docs..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notas adicionais sobre o projeto..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Projeto</Button>
                </div>
              </form>
            </Form>
          </div>
          <div className="w-80 sticky top-4 self-start">
            <Card className="w-full bg-background border shadow-lg overflow-hidden py-0">
              <CardHeader
                className="bg-primary p-4 text-primary-foreground"
                style={{
                  backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`,
                }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate">
                      {watchedName || "Nome do Projeto"}
                    </h2>
                    <p className="text-sm opacity-90">
                      Setor: {watchedSector || "Não definido"}
                    </p>
                    <p className="text-xs opacity-75 font-mono mt-1">
                      {uniqueCode}
                    </p>
                  </div>
                  {qrCode && (
                    <div className="bg-background rounded p-1">
                      <img src={qrCode} alt="QR Code" className="w-16 h-16" />
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-sm">
                <div className="flex flex-wrap gap-4">
                  <Badge variant="secondary" className="text-xs">
                    {statusLabels[watch("status") as ProjectStatus]}
                  </Badge>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{formatDate(watch("startDate")) || "Início"}</span>
                    {watch("endDate") && (
                      <span> - {formatDate(watch("endDate"))}</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {watch("description") && (
                  <div>
                    <p className="text-muted-foreground text-xs w-full line-clamp-3">
                      {watch("description")}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Project Manager & Team */}
                <div className="grid grid-cols-2 gap-4">
                  {watch("projectManager") && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">
                        {watch("projectManager")}
                      </span>
                    </div>
                  )}
                  {team.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users2Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{team.length} membros</span>
                    </div>
                  )}
                </div>

                {/* Tech Stack */}
                {techStack.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileCode2Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-xs">
                        Stack Tecnológica
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {techStack
                        .flatMap((s) => s.technologies)
                        .slice(0, 8)
                        .map((tech, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs py-0"
                          >
                            {tech}
                          </Badge>
                        ))}
                      {techStack.flatMap((s) => s.technologies).length > 8 && (
                        <Badge variant="outline" className="text-xs py-0">
                          +{techStack.flatMap((s) => s.technologies).length - 8}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {milestones.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-xs">Milestones</span>
                    </div>
                    <div className="space-y-1">
                      {milestones.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          {m.completed ? (
                            <CheckCircle2Icon className="h-3 w-3 text-chart-1" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="truncate">{m.title}</span>
                        </div>
                      ))}
                      {milestones.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{milestones.length - 4} mais
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Links */}
                {(watch("repository") || watch("documentation")) && (
                  <div className="flex flex-wrap gap-3">
                    {watch("repository") && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <LinkIcon className="h-3 w-3" />
                        <span>Repositório</span>
                      </div>
                    )}
                    {watch("documentation") && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <FileTextIcon className="h-3 w-3" />
                        <span>Docs</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {watch("notes") && (
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {watch("notes")}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Preview do documento PDF
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Dialog
        open={pdfPreviewUrl !== null}
        onOpenChange={() => setPdfPreviewUrl(null)}
        modal
      >
        <DialogContent
          className="sm:max-w-6xl p-0 border-0"
          showCloseButton={false}
        >
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              title="PDF Preview"
              style={{
                width: "100%",
                height: "82vh",
                border: "none",
              }}
            />
          ) : (
            <p className="text-[10px] text-muted-foreground text-center">
              Preview do documento PDF
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
