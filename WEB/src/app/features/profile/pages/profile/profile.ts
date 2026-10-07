import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, Subscription, switchMap } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { ImagePicker } from '../../../../shared/components/image-picker/image-picker';
import { SpotlightCard } from '../../../../shared/components/spotlight-card/spotlight-card';
import { apiErrors } from '../../../../shared/utils/api-errors';
import type { Profile } from '../../models/profile';
import { ProfileService } from '../../services/profile.service';

@Component({ selector:'app-profile', imports:[RouterLink,ReactiveFormsModule,Feedback,ImagePicker,SpotlightCard], templateUrl:'./profile.html', styleUrl:'./profile.css' })
export class ProfilePage {
  private readonly api = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private avatarRequest?: Subscription;
  private avatarTimer?: ReturnType<typeof setTimeout>;
  protected readonly profile = signal<Profile | null>(null);
  protected readonly isOwner = computed(() => this.profile()?.id === this.session.user().id);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly editing = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly success = signal('');
  protected readonly avatarUrl = signal('');
  protected readonly avatarFailed = signal(false);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly pickerVersion = signal(0);
  protected readonly form = new FormGroup({name:new FormControl('',{nonNullable:true}),bio:new FormControl('',{nonNullable:true})});
  constructor() {
    this.route.paramMap.pipe(switchMap((params) => {
      const id = params.get('id') || 'me';
      this.loading.set(true);this.errors.set([]);this.success.set('');this.profile.set(null);this.editing.set(false);
      this.selectedImage.set(null);this.pickerVersion.update(value=>value+1);
      this.stopAvatar();this.avatarUrl.set('');this.avatarFailed.set(false);
      return (id === 'me' ? this.api.me() : this.api.get(id)).pipe(catchError((error:unknown) => {
        if(error instanceof HttpErrorResponse && error.status === 404) void this.router.navigate(['/notfound']);
        else this.errors.set(apiErrors(error));
        return of(null);
      }),finalize(()=>this.loading.set(false)));
    }),takeUntilDestroyed(this.destroyRef)).subscribe(profile => {
      if(profile) {this.setProfile(profile);this.loadAvatar();}
    });
    this.destroyRef.onDestroy(()=>this.stopAvatar());
  }
  private setProfile(profile:Profile):void { this.profile.set(profile);this.form.setValue({name:profile.name,bio:profile.bio||''}); }
  private stopAvatar():void {clearTimeout(this.avatarTimer);this.avatarRequest?.unsubscribe();}
  protected loadAvatar():void {
    this.stopAvatar();
    const profile=this.profile();
    if(!profile?.hasAvatar) {this.avatarUrl.set('');return;}
    this.avatarFailed.set(false);
    this.avatarRequest=this.api.avatar(profile.id).subscribe({
      next:response=>{this.avatarUrl.set(response.url);this.avatarTimer=setTimeout(()=>this.loadAvatar(),Math.max(1000,(response.expiresInSeconds-15)*1000));},
      error:()=>this.avatarFailed.set(true),
    });
  }
  protected cancelEdit():void {const profile=this.profile();if(profile)this.setProfile(profile);this.editing.set(false);}
  protected save():void {
    if(this.busy())return;
    this.busy.set(true);this.errors.set([]);this.success.set('');
    this.api.update(this.form.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.busy.set(false))).subscribe({
      next:profile=>{this.setProfile(profile);this.editing.set(false);this.success.set('Seu perfil foi atualizado.');},
      error:(error:unknown)=>this.errors.set(apiErrors(error)),
    });
  }
  protected uploadAvatar():void {
    const image=this.selectedImage();
    if(!image||this.busy())return;
    const form=new FormData();form.append('Image',image);
    this.busy.set(true);this.errors.set([]);this.success.set('');
    this.api.uploadAvatar(form).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.profile.update(p=>p?{...p,hasAvatar:true}:p);this.selectedImage.set(null);this.pickerVersion.update(v=>v+1);this.loadAvatar();this.success.set('Foto de perfil atualizada.');},
      error:(error:unknown)=>this.errors.set(apiErrors(error)),
    });
  }
  protected removeAvatar():void {
    if(this.busy()||!window.confirm('Remover sua foto de perfil?'))return;
    this.busy.set(true);this.errors.set([]);this.success.set('');
    this.api.removeAvatar().pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.stopAvatar();this.avatarUrl.set('');this.profile.update(p=>p?{...p,hasAvatar:false}:p);this.success.set('Foto de perfil removida.');},
      error:(error:unknown)=>this.errors.set(apiErrors(error)),
    });
  }
}
