
export enum Genre {
  ROMANCE = 'Romance',
  FANTASY = 'Fantasy',
  THRILLER = 'Thriller',
  HISTORICAL = 'Historical Fiction',
  SCIFI = 'Science Fiction',
  FOLKLORE = 'Folklore',
  DRAMA = 'Drama'
}

export enum Length {
  SHORT = 'Short Story',
  MEDIUM = 'Medium Length',
  LONG = 'Long Story'
}

export interface StoryParams {
  topic: string;
  genre: Genre;
  length: Length;
  protagonist: string;
  protagonistBackground?: string;
  voiceName: string;
}

export interface GeneratedStory {
  title: string;
  content: string;
  genre: string;
  voiceName: string;
  imageUrl?: string;
  isImageLoading?: boolean;
}
