#define _GNU_SOURCE
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <stddef.h>
#include <errno.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
static void limit(int resource, rlim_t value){struct rlimit r={value,value};if(setrlimit(resource,&r)!=0){perror("setrlimit");exit(70);}}
static void block_network(void){struct sock_filter filter[]={BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,nr)),BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_socket,0,1),BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|EPERM),BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,__NR_connect,0,1),BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|EPERM),BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW)};struct sock_fprog p={.len=(unsigned short)(sizeof(filter)/sizeof(filter[0])),.filter=filter};if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)!=0||prctl(PR_SET_SECCOMP,SECCOMP_MODE_FILTER,&p)!=0){perror("seccomp");exit(70);}}
int main(int argc,char**argv){if(argc!=5)return 64;if(prctl(PR_SET_DUMPABLE,0,0,0,0)!=0||prctl(PR_GET_DUMPABLE,0,0,0,0)!=0)return 70;limit(RLIMIT_CORE,0);limit(RLIMIT_NOFILE,32);limit(RLIMIT_CPU,argv[2][0]=='p'?45:30);clearenv();setenv("PATH","/usr/local/bin:/usr/bin:/bin",1);setenv("VANSTRO_MEDIA_PARSER","1",1);block_network();char*const args[]={"node",argv[1],argv[2],argv[3],argv[4],NULL};execv("/usr/local/bin/node",args);perror("execv");return 70;}
