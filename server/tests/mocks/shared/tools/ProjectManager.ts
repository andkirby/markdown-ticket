/// <reference types="jest" />

export class ProjectManager {
  static createProject: jest.Mock
  static validateProject: jest.Mock
  static loadProject: jest.Mock

  static {
    this.createProject = jest.fn()
    this.validateProject = jest.fn()
    this.loadProject = jest.fn()
  }
}
