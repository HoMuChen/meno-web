export interface SocialMedia {
  linkedin?: string
  twitter?: string
  facebook?: string
  instagram?: string
  github?: string
}

export interface Person {
  _id: string
  name: string
  email?: string
  phone?: string
  company?: string
  socialMedia?: SocialMedia
  notes?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreatePersonRequest {
  name: string
  email?: string
  phone?: string
  company?: string
  socialMedia?: SocialMedia
  notes?: string
}

export interface UpdatePersonRequest {
  name?: string
  email?: string
  phone?: string
  company?: string
  socialMedia?: SocialMedia
  notes?: string
}

export interface PeopleResponse {
  success: boolean
  data: {
    people: Person[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
}
