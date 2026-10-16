export interface NavigationDivision {
  id: string;
  number: number;
  heading: string;
  type: "chapter" | "part";
}

export interface NavigationBook {
  id: string;
  type: "prelude" | "book";
  book_number?: number | null;
  heading: string;
  divisions: NavigationDivision[];
}

export interface NavigationVolume {
  volumeNum: number;
  volumeTitle: string;
}

export interface NavLink {
  title: string;
  href: string;
}
