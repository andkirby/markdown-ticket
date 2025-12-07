class ProjectService {
  constructor() {
    this.getAllProjects = jest.fn();
    this.getProjectConfig = jest.fn();
    this.getProjectCRs = jest.fn();
    this.getSystemDirectories = jest.fn();
    this.configureDocuments = jest.fn();
    this.checkDirectoryExists = jest.fn();
    this.getGlobalConfig = jest.fn();
    this.projectDiscovery = {
      getAllProjects: jest.fn()
    };
  }
}

class Project {}

class GlobalConfig {}

module.exports = { ProjectService, Project, GlobalConfig };