"""母音を伸ばした録音3本（v1〜v3.f32）の図と、1秒ごとの倍音の山を出す（numpy と matplotlib）。

使い方:
  ffmpeg -i 録音.m4a -ac 1 -ar 22050 -f f32le 作業フォルダ/audio/v1.f32   （v2, v3 も同じ）
  python3 tools/vowel_sweep_analysis.py 作業フォルダ

録音そのものはリポジトリに入れない。docs/kanshu-overtone-gin.md の「母音を伸ばした録音」はこれで出した。
"""
import numpy as np, sys, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.family']='Hiragino Sans'
S=sys.argv[1]; sr=22050; N=4096; H=441
names=['① 真っすぐ伸ばし','② 口腔内共振（最後は大きく開口）','③ 喉を締める（口の開きを変えて）']
fig,ax=plt.subplots(3,1,figsize=(13,14))
for n in range(3):
    x=np.fromfile(f'{S}/audio/v{n+1}.f32',dtype=np.float32)
    nf=(len(x)-N)//H; ix=np.arange(N)[None,:]+H*np.arange(nf)[:,None]
    fr_=x[ix]; w=np.hanning(N); sp=np.abs(np.fft.rfft(fr_*w)); fq=np.fft.rfftfreq(N,1/sr); t=np.arange(nf)*H/sr+N/2/sr
    db=20*np.log10(np.sqrt((fr_**2).mean(1))+1e-9); act=db>db.max()-25
    # f0 via autocorr
    F=np.fft.rfft(fr_*w,2*N); ac=np.fft.irfft(np.abs(F)**2)[:,:N]; ac/=ac[:,:1]+1e-12
    lo,hi=int(sr/300),int(sr/60); lag=lo+np.argmax(ac[:,lo:hi],1)
    a,b,c=ac[np.arange(nf),lag-1],ac[np.arange(nf),lag],ac[np.arange(nf),lag+1]
    f0=sr/(lag+0.5*(a-c)/(a-2*b+c+1e-12))
    Sd=20*np.log10(sp+1e-7); k=fq<5000
    ax[n].imshow(Sd[:,k].T,origin='lower',aspect='auto',extent=[t[0],t[-1],0,5000],cmap='magma',vmin=Sd.max()-75,vmax=Sd.max())
    ax[n].set_title(names[n]); ax[n].set_ylabel('周波数 (Hz)'); ax[n].set_xlabel('時間 (秒)'); ax[n].set_yticks(range(0,5001,500))
    print('==',names[n],'長さ',round(len(x)/sr,1),'秒  F0中央',round(float(np.median(f0[act])),1))
    # per-second: harmonic amplitudes, list harmonics that are local envelope peaks
    K=34
    for s0 in np.arange(0,t[-1],1.0):
        m=act&(t>=s0)&(t<s0+1.0)
        if m.sum()<10: continue
        f=np.median(f0[m]); A=np.zeros(K)
        for kk in range(1,K+1):
            j0=np.searchsorted(fq,kk*f*0.97); j1=np.searchsorted(fq,kk*f*1.03)+1
            A[kk-1]=20*np.log10(np.sqrt((sp[m][:,j0:j1].max(1)**2).mean())+1e-9)
        A-=A.max()
        pk=[kk for kk in range(2,K) if A[kk-1]>A[kk-2] and A[kk-1]>=A[kk] and A[kk-1]>-45]
        # prominence
        out=[]
        for kk in pk:
            nb=[A[j-1] for j in (kk-2,kk-1,kk+1,kk+2) if 1<=j<=K]
            out.append(f"{int(kk*f)}Hz(h{kk},{A[kk-1]:.0f}dB,+{A[kk-1]-np.mean(nb):.0f})")
        print(f"{s0:4.0f}s f0={f:5.1f} lvl={db[m].mean()-db.max():5.1f} | "+' '.join(out))
plt.tight_layout(); plt.savefig(f'{S}/audio/vowel.png',dpi=105)
