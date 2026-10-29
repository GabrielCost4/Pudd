import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-navigation',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './admin-navigation.html',
  styleUrl: './admin-navigation.css',
})
export class AdminNavigation {}
