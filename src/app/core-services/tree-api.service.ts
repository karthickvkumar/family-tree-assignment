import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TreeAPIService {

  constructor(private http: HttpClient) { }

  getAllNode() {
    let url: string = environment.apiURL + "nodes";
    return this.http.get(url);
  }

  createNode(node) {
    let url: string = environment.apiURL + "node/add";
    return this.http.post(url, node);
  }

  updateNode(node) {
    let url: string = environment.apiURL + "node/edit/" + node.id;
    return this.http.put(url, node);
  }

  notification(message) {
    alert(message);
  }

}
