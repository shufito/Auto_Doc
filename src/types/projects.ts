export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";

export interface PDFColor {
  r: number;
  g: number;
  b: number;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
}

export interface TechStack {
  category: string;
  technologies: string[];
}

export interface Project {
  id: string;
  uniqueCode: string;
  name: string;
  description: string;
  sector: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  projectManager: string;
  team: string[];
  milestones: ProjectMilestone[];
  techStack: TechStack[];
  repository?: string;
  documentation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const statusLabels: Record<ProjectStatus, string> = {
  planning: "Planejamento",
  in_progress: "Em Andamento",
  completed: "Concluído",
  on_hold: "Pausado",
  cancelled: "Cancelado",
};

export const statusColors: Record<ProjectStatus, string> = {
  planning: "bg-chart-3 text-primary-foreground",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-chart-1 text-primary-foreground",
  on_hold: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};
