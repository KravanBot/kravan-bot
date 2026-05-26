declare module "urban" {
  interface UrbanDefinition {
    word: string;
    definition: string;
    example: string;
    author: string;
    thumbs_up: number;
    thumbs_down: number;
    permalink: string;
    defid: number;
  }

  interface UrbanQuery {
    first(callback: (result: UrbanDefinition) => void): void;
    each(callback: (results: UrbanDefinition) => void): void;
  }

  interface Urban {
    (word: string): UrbanQuery;
    random(): UrbanQuery;
  }

  const urban: Urban;
  export = urban;
}
