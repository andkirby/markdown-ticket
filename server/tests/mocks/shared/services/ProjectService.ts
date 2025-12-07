/// <reference types="jest" />

export class ProjectService {
  getAllProjects: jest.Mock;
  getProjectConfig: jest.Mock;
  getProjectCRs: jest.Mock;
  getSystemDirectories: jest.Mock;
  configureDocuments: jest.Mock;
  checkDirectoryExists: jest.Mock;

  constructor() {
    this.getAllProjects = jest.fn();
    this.getProjectConfig = jest.fn();
    this.getProjectCRs = jest.fn();
    this.getSystemDirectories = jest.fn();
    this.configureDocuments = jest.fn();
    this.checkDirectoryExists = jest.fn();
  }
}

export const GlobalConfig = {};
export const Project = class {};